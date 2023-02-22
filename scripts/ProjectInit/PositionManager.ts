import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contracts } from "./Contracts";
import { ERC20Utils } from "./ERC20Utils";
import { EtherUtils } from "./EtherUtils";
import { LeverageHelper } from "./LeverageHelper";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { Pools } from "./Pools";
import { PositionInfo } from "./PositionInfo";
import { TestConstants } from "./TestConstants";
import { ValueStore } from "./ValueStore";

export class PositionManager {
    contracts: Contracts;
    pools: Pools;

    constructor (contracts: Contracts, pools: Pools) {
        this.contracts = contracts;
        this.pools = pools;
    }

    async createPositionEndToEnd(position: PositionInfo, printCreation = false) {
        await this.approveForPositionCreation(position);

        await this.createPosition(position);
        // Now fill all the info needed on position
        await position.fillPositionPostCreation();
        // await position.fillPositionExchangeEstimates(this.pools);

        EtherUtils.mineBlock();
        if (printCreation === true) {
            console.log("printing position info after creation")
            await position.printPositionInfo();
        }
    }

    async unwindPositionAndVerify(position: PositionInfo) {
        if (await position.isPositionExists() === false) {
            throw new Error("Position does not exist");
        }

        await this.unwindPosition(position);

        if (await position.isPositionExists() === true) {
            throw new Error("Position was unwound but still exists");
        }
    }

    async unwindPosition(position: PositionInfo) {
        const userOusdBalanceBefore = await ERC20Utils.balance(position.positionOwner.address, this.contracts.externalOUSD);
        console.log("Min amount accepting for position windfall %s ", position.minReturnedOUSD.getNum())
        await this.contracts.leverageEngine.connect(position.positionOwner)
            .unwindLeveragedPosition(
                position.positionTokenNum,
                position.minReturnedOUSD.getBn());
        EtherUtils.mineBlock();
        const userOusdBalanceAfter = await ERC20Utils.balance(position.positionOwner.address, this.contracts.externalOUSD);
        const ousdReturned = NumberBundle.withBn(userOusdBalanceAfter.getBn().sub(userOusdBalanceBefore.getBn()));
        position.fillPositionPostUnwind(ousdReturned);
    }

    async createPosition(position: PositionInfo) {
        // basically do a preview to get the return value of this method
        const previewPositionId = await this.contracts.leverageEngine
            .connect(position.positionOwner)
            .callStatic
            .createLeveragedPosition(
                position.collateral.getBn(),
                position.cycles,
                position.archFee.getBn(),
                0,
            );
        await this.contracts.leverageEngine.connect(position.positionOwner).createLeveragedPosition(
            position.collateral.getBn(),
            position.cycles,
            position.archFee.getBn(),
            0,
        );
        position.positionTokenNum = previewPositionId.toNumber();
    }

    // async checkCorrectPositionOwner(position: PositionInfo): True {
    //     const owner = await this.contracts.positionToken.ownerOf(position.positionID);
    //     return owner;
    // }

    async approveForPositionCreation(position: PositionInfo) {
        const spenderOfFundsAddress = this.contracts.leverageEngine.address;
        await ERC20Utils.approveAndVerify(
            spenderOfFundsAddress,
            position.collateral,
            this.contracts.externalOUSD,
            position.positionOwner,
        );
        await ERC20Utils.approveAndVerify(
            spenderOfFundsAddress,
            position.archFee,
            this.contracts.archToken,
            position.positionOwner,
        );
    }

    /// Fund the user with any tokens they might need to create positions
    /// Funds USDT, ARCH, and OUSD
    async fundSignerForPosition(signer: SignerWithAddress, leverageHelper: LeverageHelper) {
        await this.pools.exchangeEthForExactStable(TestConstants.ONE_THOUSAND_USDT.getBn(), signer.address, this.contracts.externalUSDT.address);
        await this.pools.exchangeExactEthForOUSD(TestConstants.ONE_ETH.getBn(), signer.address);
        await ERC20Utils.getArchFromTreasury(TestConstants.ONE_HUNDRED_ETH, signer.address, this.contracts);
        const usdtBalance = await ERC20Utils.balance(signer.address, this.contracts.externalUSDT);
        const archBalance = await ERC20Utils.balance(signer.address, this.contracts.archToken);
        const ousdBalance = await ERC20Utils.balance(signer.address, this.contracts.externalOUSD);
        Logger.log("Signer %s has been funded with %s USDT and %s Arch and %s OUSD",
            signer.address,
            usdtBalance.getNum(),
            archBalance.getNum(),
            ousdBalance.getNum(),
        );
    }
}
