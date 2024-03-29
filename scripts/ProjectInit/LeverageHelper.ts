import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contracts } from "./Contracts";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { TestConstants } from "./TestConstants";

export class LeverageHelper {
    contracts: Contracts;

    constructor (contracts: Contracts) {
        this.contracts = contracts;
    }

    async startAuctionAndAcceptLeverage(auction: AuctionInfo, owner = this.contracts.signers.owner) {
        // await this._startAuction(auction, owner);
        await this._acceptLeverage(auction.leverageAmount, owner);
        Logger.log("Auction started with endPrice of %s and leverage of %s lvUSD accepted\n",
            auction.endPrice.getNum(), auction.leverageAmount.getNum());
    }

    async startAuctionAndMintAndAcceptLeverage(auction: AuctionInfo) {
        await this.mintLvUSD(auction.leverageAmount, this.contracts.coordinator.address);
        await this.startAuctionAndAcceptLeverage(auction);
    }

    async mintLvUSD(amount: NumberBundle, to: string) {
        // Todo : need to make sure minter is calling those two functions
        await this.contracts.lvUSD.setMintDestination(to);
        await this.contracts.lvUSD.mint(amount.getBn());
    }

    async getLvUSDBalance(address: string): NumberBundle {
        const balance = await this.contracts.lvUSD.balanceOf(address);
        const balanceBundle = NumberBundle.withBn(balance);
        return balanceBundle;
    }

    async coordinatorAvailableLvUSD(): NumberBundle {
        const availableLeverage = await this.contracts.lvUSD.balanceOf(this.contracts.coordinator.address);
        const availableLeverageBundle = NumberBundle.withBn(availableLeverage);
    }

    async _startAuction(auction: AuctionInfo, owner) {
        await this.contracts.auction.connect(owner).startAuctionWithLength(auction.length, auction.startPrice.getBn(), auction.endPrice.getBn());
    }

    async _acceptLeverage(amount: NumberBundle, owner) {
        if (await this.contracts.auction.isAuctionClosed()) {
            throw new Error("Must be in an active auction to accept leverage");
        } else {
            await this.contracts.coordinator.connect(owner).acceptLeverageAmount(amount.getBn());
        }
    }
}

export class AuctionInfo {
    length: number;
    startPrice: NumberBundle;
    endPrice: NumberBundle;
    leverageAmount: NumberBundle;

    constructor (
        length: number = TestConstants.AUCTION_LENGTH_DEFAULT,
        startPrice: NumberBundle = TestConstants.AUCTION_START_PRICE_DEFAULT,
        endPrice: NumberBundle = TestConstants.AUCTION_END_PRICE_DEFAULT,
        leverageAmount: NumberBundle = TestConstants.AUCTION_LEVERAGE_AMOUNT_DEFAULT) {
        this.startPrice = startPrice;
        this.endPrice = endPrice;
        this.length = length;
        this.leverageAmount = leverageAmount;
    }
}
