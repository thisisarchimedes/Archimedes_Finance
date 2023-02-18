import { Contracts } from "./Contracts";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Pools } from "./Pools";
import { BigNumber } from "ethers";

export class PositionInfo {
    contracts: Contracts;
    positionOwner: SignerWithAddress;
    cycles: number;
    collateral: NumberBundle;
    positionId: number;
    leverageTaken: NumberBundle;
    archFee: NumberBundle;
    archToLevRatio: NumberBundle;

    positionTokenNum = -1;
    cdpBorrowedLvUSD: NumberBundle;
    cdpShares: NumberBundle;
    ousdDepositedInVault: NumberBundle;
    ousdFeesAtCreationRoughEstimate: NumberBundle;

    ousdRedeemed: NumberBundle;

    fillPostCreationCalled = false;
    fillPostUnwindCalled = false;
    ousdFinalEarning: number;

    minReturnedOUSD: NumberBundle

    private constructor (contracts: Contracts, owner: SignerWithAddress, collateral: NumberBundle, cycles: number) {
        this.contracts = contracts;
        this.positionOwner = owner;
        this.collateral = collateral;
        this.cycles = cycles;
    }

    static async build(contracts: Contracts, owner: SignerWithAddress, collateral: NumberBundle, cycles: number): PositionInfo {
        const positionInfo: PositionInfo = new PositionInfo(contracts, owner, collateral, cycles);
        await positionInfo._fillPositionInfo();
        return positionInfo;
    }

    async _fillPositionInfo() {
        this.leverageTaken = await this.getPositionLeverageTaken();
        this.archFee = await this.getArchFee();
        this.archToLevRatio = NumberBundle.withBn(
            await this.contracts.parameterStore.getArchToLevRatio(),
        );
        this.minReturnedOUSD = NumberBundle.withNum(this.collateral.getNum() * 0.95, 18);
    }

    async fillPositionPostCreation() {
        this.fillPostCreationCalled = true;

        const cdpBorrowedLvUSD = NumberBundle.withBn(await this.contracts.cdp.getLvUSDBorrowed(this.positionTokenNum));
        const cdpShares = NumberBundle.withBn(await this.contracts.cdp.getShares(this.positionTokenNum));
        const oUSDDepositedInVault = NumberBundle.withBn(
            await this.contracts.vault.previewRedeem(cdpShares.getBn()),
        );
        const ousdFeesCalcEstimate: number = this.collateral.getNum() + this.leverageTaken.getNum() - oUSDDepositedInVault.getNum();

        this.cdpBorrowedLvUSD = cdpBorrowedLvUSD;
        this.cdpShares = cdpShares;
        this.ousdDepositedInVault = oUSDDepositedInVault;
        this.ousdFeesAtCreationRoughEstimate = NumberBundle.withNum(ousdFeesCalcEstimate);
    }

    async fillPositionExchangeEstimates(pool: Pools) {
        if (this.fillPostCreationCalled === false) {
            throw new Error("fillPositionExchangeEstimates called before fillPositionPostCreation");
        }
        const crvExchangeEstimateOnCreate = await pool.estimatelvUSDtoCrvExchange(this.cdpBorrowedLvUSD);
        const ousdExchangeEstimateOnCreate = await pool.estimateCrvToOusdExchange(crvExchangeEstimateOnCreate);
    }

    async fillPositionPostUnwind(ousdRedeemed: NumberBundle) {
        this.fillPostUnwindCalled = true;
        this.ousdRedeemed = ousdRedeemed;
        this.ousdFinalEarning = ousdRedeemed.getNum() - this.collateral.getNum();
    }

    async getPositionLeverageTaken(): NumberBundle {
        const leverage = await this.contracts.parameterStore.getAllowedLeverageForPosition(this.collateral.getBn(), this.cycles);
        return NumberBundle.withBn(leverage);
    }

    async getArchFee(): NumberBundle {
        const leverage = await this.getPositionLeverageTaken();
        const archFee = await this.contracts.parameterStore.calculateArchNeededForLeverage(leverage.getBn());
        const archFeeBundle = NumberBundle.withBn(archFee);
        return archFeeBundle;
    }

    async isPositionExists(): boolean {
        if (this.fillPostCreationCalled === true) {
            return await this.contracts.positionToken.exists(this.positionTokenNum);
        } else {
            throw new Error("PositionInfo.fillPositionPostCreation() must be called before isPositionExists()");
        }
    }

    async printPositionInfo() {
        // Logger.log("Position Owner: %s", this.positionOwner.address);
        Logger.log("Position Info: Collateral: %s, Cycles: %s, Leverage Taken: %s",
            this.collateral.getNum(),
            this.cycles,
            (await this.getPositionLeverageTaken()).getNum(),
        );
        Logger.log("Arch Fee: %s at arch/Lev ratio of %s", (await this.getArchFee()).getNum(), this.archToLevRatio.getNum());
        if (this.fillPostCreationCalled) {
            Logger.log("Position token ID: %s", this.positionTokenNum);
            // Logger.log("CDP Shares: %s", this.cdpShares.getNum());
            // Logger.log("CDP Borrowed LvUSD: %s", this.cdpBorrowedLvUSD.getNum());
            Logger.log("For %s borrowed lvUSD + %s OUSD collataeral, %s OUSD was Deposited in Vault.\
             Which means around %s OUSD was taken as fees + slippage(if exchange 1:1)",
                this.cdpBorrowedLvUSD.getNum(),
                this.collateral.getNum(),
                this.ousdDepositedInVault.getNum(),
                this.ousdFeesAtCreationRoughEstimate.getNum());
        }
        if (this.fillPostUnwindCalled) {
            Logger.log("When unwinded, %s OUSD Redeemed, which means user got %s OUSD earning", this.ousdRedeemed.getNum(), this.ousdFinalEarning);
        }
    }
}
