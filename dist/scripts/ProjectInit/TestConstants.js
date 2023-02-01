"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestConstants = void 0;
const NumberBundle_1 = require("./NumberBundle");
class TestConstants {
}
exports.TestConstants = TestConstants;
TestConstants.ONE_ETH = NumberBundle_1.NumberBundle.withNum(1);
TestConstants.TEN_ETH = NumberBundle_1.NumberBundle.withNum(10);
TestConstants.ONE_HUNDRED_ETH = NumberBundle_1.NumberBundle.withNum(100);
TestConstants.ONE_THOUSAND_ETH = NumberBundle_1.NumberBundle.withNum(1000);
TestConstants.ONE_USDT = NumberBundle_1.NumberBundle.withNum(1, 6);
TestConstants.TEN_USDT = NumberBundle_1.NumberBundle.withNum(10, 6);
TestConstants.ONE_HUNDRED_USDT = NumberBundle_1.NumberBundle.withNum(100, 6);
TestConstants.ONE_THOUSAND_USDT = NumberBundle_1.NumberBundle.withNum(1000, 6);
TestConstants.AUCTION_END_PRICE_DEFAULT = NumberBundle_1.NumberBundle.withNum(300, 18);
TestConstants.AUCTION_START_PRICE_DEFAULT = NumberBundle_1.NumberBundle.withNum(200, 18);
TestConstants.AUCTION_LENGTH_DEFAULT = 5;
TestConstants.AUCTION_LEVERAGE_AMOUNT_DEFAULT = NumberBundle_1.NumberBundle.withNum(1000, 18);
