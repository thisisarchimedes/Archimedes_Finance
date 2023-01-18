"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionInfo = exports.LeverageHelper = void 0;
const Logger_1 = require("./Logger");
const NumberBundle_1 = require("./NumberBundle");
const TestConstants_1 = require("./TestConstants");
class LeverageHelper {
    constructor(contracts) {
        this.contracts = contracts;
    }
    async startAuctionAndMintAndAcceptLeverage(auction) {
        await this.mintLvUSD(auction.leverageAmount, this.contracts.coordinator.address);
        await this._startAuction(auction);
        await this._acceptLeverage(auction.leverageAmount);
        Logger_1.Logger.log("Auction started with endPrice of %s and leverage of %s lvUSD accepted\n", auction.endPrice.getNum(), auction.leverageAmount.getNum());
    }
    async mintLvUSD(amount, to) {
        // Todo : need to make sure minter is calling those two functions
        await this.contracts.lvUSD.setMintDestination(to);
        await this.contracts.lvUSD.mint(amount.getBn());
    }
    async getLvUSDBalance(address) {
        const balance = await this.contracts.lvUSD.balanceOf(address);
        const balanceBundle = NumberBundle_1.NumberBundle.withBn(balance);
        return balanceBundle;
    }
    async coordinatorAvailableLvUSD() {
        const availableLeverage = await this.contracts.lvUSD.balanceOf(this.contracts.coordinator.address);
        const availableLeverageBundle = NumberBundle_1.NumberBundle.withBn(availableLeverage);
    }
    async _startAuction(auction) {
        await this.contracts.auction.startAuctionWithLength(auction.length, auction.startPrice.getBn(), auction.endPrice.getBn());
    }
    async _acceptLeverage(amount) {
        if (await this.contracts.auction.isAuctionClosed()) {
            throw new Error("Must be in an active auction to accept leverage");
        }
        else {
            await this.contracts.coordinator.acceptLeverageAmount(amount.getBn());
        }
    }
}
exports.LeverageHelper = LeverageHelper;
class AuctionInfo {
    constructor(length = TestConstants_1.TestConstants.AUCTION_LENGTH_DEFAULT, startPrice = TestConstants_1.TestConstants.AUCTION_START_PRICE_DEFAULT, endPrice = TestConstants_1.TestConstants.AUCTION_END_PRICE_DEFAULT, leverageAmount = TestConstants_1.TestConstants.AUCTION_LEVERAGE_AMOUNT_DEFAULT) {
        this.startPrice = startPrice;
        this.endPrice = endPrice;
        this.length = length;
        this.leverageAmount = leverageAmount;
    }
}
exports.AuctionInfo = AuctionInfo;
