import { NumberBundle } from "./NumberBundle";

export class TestConstants {
    static readonly ONE_ETH = NumberBundle.withNum(1);
    static readonly TEN_ETH = NumberBundle.withNum(10);
    static readonly ONE_HUNDRED_ETH = NumberBundle.withNum(100);
    static readonly ONE_THOUSAND_ETH = NumberBundle.withNum(1000);

    static readonly ONE_USDT = NumberBundle.withNum(1, 6);
    static readonly TEN_USDT = NumberBundle.withNum(10, 6);
    static readonly ONE_HUNDRED_USDT = NumberBundle.withNum(100, 6);
    static readonly ONE_THOUSAND_USDT = NumberBundle.withNum(1000, 6);

    static readonly AUCTION_END_PRICE_DEFAULT = NumberBundle.withNum(300, 18);
    static readonly AUCTION_START_PRICE_DEFAULT = NumberBundle.withNum(200, 18);

    static readonly AUCTION_LENGTH_DEFAULT = 5;

    static readonly AUCTION_LEVERAGE_AMOUNT_DEFAULT = NumberBundle.withNum(1000, 18);
}
