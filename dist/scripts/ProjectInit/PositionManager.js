"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionManager = exports.PositionInfo = void 0;
const ERC20Utils_1 = require("./ERC20Utils");
const Logger_1 = require("./Logger");
const NumberBundle_1 = require("./NumberBundle");
const TestConstants_1 = require("./TestConstants");
class PositionInfo {
    constructor(contracts, owner, collateral, cycles) {
        this.positionID = -1;
        this.fillPostCreationCalled = false;
        this.contracts = contracts;
        this.positionOwner = owner;
        this.collateral = collateral;
        this.cycles = cycles;
    }
    static async build(contracts, owner, collateral, cycles) {
        const positionInfo = new PositionInfo(contracts, owner, collateral, cycles);
        await positionInfo._fillPositionInfo();
        return positionInfo;
    }
    async _fillPositionInfo() {
        this.leverageTaken = await this.getPositionLeverageTaken();
        this.archFee = await this.getArchFee();
        this.archToLevRatio = NumberBundle_1.NumberBundle.withBn(await this.contracts.parameterStore.getArchToLevRatio());
    }
    async fillPositionPostCreation(positionID) {
        this.positionID = positionID;
        this.fillPostCreationCalled = true;
        /*
        uint256 oUSDPrinciple; // Amount of OUSD originally deposited by user
        // uint256 oUSDInterestEarned; // Total interest earned (and rebased) so far  -< /// TODO remove this item
        uint256 oUSDTotalWithoutInterest; // Principle + OUSD acquired from selling borrowed lvUSD
        uint256 lvUSDBorrowed; // Total lvUSD borrowed under this position
        uint256 shares; // Total vault shares allocated to this position
        // // New values, need to implement changing values
        uint256 openTimeStamp; // Open time
        uint256 positionLifetimeInDays; // Position in days
        uint256 positionExpiration;
        */
        Logger_1.Logger.log("Starting setting up position info post creation");
        const cdpBorrowedLvUSD = NumberBundle_1.NumberBundle.withBn(await this.contracts.cdp.getLvUSDBorrowed(positionID));
        console.log("1");
        const cdpShares = NumberBundle_1.NumberBundle.withBn(await this.contracts.cdp.getShares(positionID));
        console.log("2");
        const oUSDInVaultForPosition = NumberBundle_1.NumberBundle.withBn(await this.contracts.vault.previewRedeem(oUSDInVaultForPosition.getBn()));
        Logger_1.Logger.log("Finished setting up position info post creation");
        this.cdpBorrowedLvUSD = cdpBorrowedLvUSD;
        this.cdpShares = cdpShares;
        this.ousdDepositedInVaultForPosition = oUSDInVaultForPosition;
    }
    async getPositionLeverageTaken() {
        const leverage = await this.contracts.parameterStore.getAllowedLeverageForPosition(this.collateral.getBn(), this.cycles);
        return NumberBundle_1.NumberBundle.withBn(leverage);
    }
    async getArchFee() {
        const leverage = await this.getPositionLeverageTaken();
        const archFee = await this.contracts.parameterStore.calculateArchNeededForLeverage(leverage.getBn());
        const archFeeBundle = NumberBundle_1.NumberBundle.withBn(archFee);
        return archFeeBundle;
    }
    async printPositionInfo() {
        Logger_1.Logger.log("Position Info:");
        Logger_1.Logger.log("Position Owner: %s", this.positionOwner.address);
        // Logger.log("Position ID: %s", this.positionId);
        Logger_1.Logger.log("Collateral: %s", this.collateral.getNum());
        Logger_1.Logger.log("Cycles: %s", this.cycles);
        Logger_1.Logger.log("Leverage Taken: %s", (await this.getPositionLeverageTaken()).getNum());
        Logger_1.Logger.log("Arch Fee: %s at arch/Lev ratio of %s", (await this.getArchFee()).getNum(), this.archToLevRatio.getNum());
        if (this.fillPostCreationCalled) {
            Logger_1.Logger.log("CDP Shares: %s", this.cdpShares.getNum());
            Logger_1.Logger.log("CDP Borrowed LvUSD: %s", this.cdpBorrowedLvUSD.getNum());
            Logger_1.Logger.log("OUSD Deposited in Vault for Position: %s", this.ousdDepositedInVaultForPosition.getNum());
        }
    }
}
exports.PositionInfo = PositionInfo;
class PositionManager {
    constructor(contracts, pools) {
        this.contracts = contracts;
        this.pools = pools;
    }
    async createPosition(position) {
        const positionId = await this.contracts.leverageEngine.connect(position.positionOwner).createLeveragedPosition(position.collateral.getBn(), position.cycles, position.archFee.getBn());
    }
    async getOwnerOfPosition(position) {
        const owner = await this.contracts.positionToken.ownerOf(position);
        return owner;
    }
    async approveForPositionCreation(position) {
        const spenderOfFundsAddress = this.contracts.leverageEngine.address;
        await ERC20Utils_1.ERC20Utils.approveAndVerify(spenderOfFundsAddress, position.collateral, this.contracts.externalOUSD, position.positionOwner);
        await ERC20Utils_1.ERC20Utils.approveAndVerify(spenderOfFundsAddress, position.archFee, this.contracts.archToken, position.positionOwner);
    }
    /// Fund the user with any tokens they might need to create positions 
    /// Funds USDT, ARCH, and OUSD
    async fundSignerForPosition(signer, leverageHelper) {
        await this.pools.exchangeEthForExactStable(TestConstants_1.TestConstants.ONE_THOUSAND_USDT.getBn(), signer.address, this.contracts.externalUSDT.address);
        await this.pools.exchangeExactEthForOUSD(TestConstants_1.TestConstants.ONE_ETH.getBn(), signer.address);
        await ERC20Utils_1.ERC20Utils.getArchFromTreasury(TestConstants_1.TestConstants.ONE_HUNDRED_ETH, signer.address, this.contracts);
        const usdtBalance = await ERC20Utils_1.ERC20Utils.balance(signer.address, this.contracts.externalUSDT);
        const archBalance = await ERC20Utils_1.ERC20Utils.balance(signer.address, this.contracts.archToken);
        const ousdBalance = await ERC20Utils_1.ERC20Utils.balance(signer.address, this.contracts.externalOUSD);
        Logger_1.Logger.log("Signer %s has been funded with %s USDT and %s Arch and %s OUSD", signer.address, usdtBalance.getNum(), archBalance.getNum(), ousdBalance.getNum());
    }
}
exports.PositionManager = PositionManager;
