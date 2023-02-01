import { Contracts } from "./contracts";
import { NumberBundle } from "./NumberBundle";
export declare class LeverageHelper {
    contracts: Contracts;
    constructor(contracts: Contracts);
    startAuctionAndMintAndAcceptLeverage(auction: AuctionInfo): Promise<void>;
    mintLvUSD(amount: NumberBundle, to: String): Promise<void>;
    getLvUSDBalance(address: String): NumberBundle;
    coordinatorAvailableLvUSD(): NumberBundle;
    _startAuction(auction: AuctionInfo): Promise<void>;
    _acceptLeverage(amount: NumberBundle): Promise<void>;
}
export declare class AuctionInfo {
    length: number;
    startPrice: NumberBundle;
    endPrice: NumberBundle;
    leverageAmount: NumberBundle;
    constructor(length?: number, startPrice?: NumberBundle, endPrice?: NumberBundle, leverageAmount?: NumberBundle);
}
