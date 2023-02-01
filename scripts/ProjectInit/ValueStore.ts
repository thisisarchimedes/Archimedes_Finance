import { abi3CRVToken, abiOUSDToken, abiUSDTToken, abiCurveFactory, routerABI, abi3PoolImplementation, abiCurve3Pool } from "../../test/ABIs";
import { ethers } from "hardhat";
export class ValueStore {
    static addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    static addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    static addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
    static address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
    static addressUSDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    static addressDAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    static addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
    static addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
    static addressCurveOUSDPool = "0x87650D7bbfC3A9F10587d7778206671719d9910D";
    static addressUniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    static abiOUSDToken = abiOUSDToken;
    static abiUSDTToken = abiUSDTToken;
    static abi3CRVToken = abi3CRVToken;
    static abiCurveFactory = abiCurveFactory;
    static abiCurve3Pool = abiCurve3Pool;
    static abi3PoolImplementation = abi3PoolImplementation;
    static abiUniswapRouter = routerABI;

    static ONE_ETH = ethers.utils.parseUnits("1.0", 18);
}
