"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueStore = void 0;
const ABIs_1 = require("../../test/ABIs");
class ValueStore {
}
exports.ValueStore = ValueStore;
ValueStore.addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
ValueStore.addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
ValueStore.addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
ValueStore.address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
ValueStore.addressUSDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
ValueStore.addressDAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
ValueStore.addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
ValueStore.addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
ValueStore.addressCurveOUSDPool = "0x87650D7bbfC3A9F10587d7778206671719d9910D";
ValueStore.addressUniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
ValueStore.abiOUSDToken = ABIs_1.abiOUSDToken;
ValueStore.abiUSDTToken = ABIs_1.abiUSDTToken;
ValueStore.abi3CRVToken = ABIs_1.abi3CRVToken;
ValueStore.abiCurveFactory = ABIs_1.abiCurveFactory;
ValueStore.abiCurve3Pool = ABIs_1.abiCurve3Pool;
ValueStore.abi3PoolImplementation = ABIs_1.abi3PoolImplementation;
ValueStore.abiUniswapRouter = ABIs_1.routerABI;
ValueStore.ONE_ETH = ethers.utils.parseUnits("1.0", 18);
