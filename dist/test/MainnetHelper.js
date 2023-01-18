"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexCurveOUSD3CRV = exports.indexCurveOUSDOUSD = exports.indexTripoolWETH9 = exports.indexTripoolUSDT = exports.abi3PoolImplementation = exports.abiCurve3Pool = exports.abi3CRVToken = exports.abiCurveFactory = exports.abiWETH9Token = exports.abiUSDTToken = exports.abiCurveTripool2 = exports.abiCurveOUSDPool = exports.abiOUSDToken = exports.routeAddress = exports.addressCurveRegistry = exports.address3CRVlvUSDPool = exports.addressZap = exports.addressUSDC = exports.address3CRV = exports.addressOUSD = exports.addressCurveOUSDPool = exports.addressCurve3Pool = exports.addressCurveFactory = exports.addressWETH9 = exports.addressUSDT = exports.addressCurveTripool2 = exports.helperSwapETHWithOUSD = exports.helperSwapETHWith3CRV = exports.helperSwapETHWithUSDT = exports.helperResetNetwork = exports.defaultBlockNumber = exports.createUniswapPool = exports.numFromBn = exports.bnFromStr = exports.bnFromNum = void 0;
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const ABIs_1 = require("./ABIs");
Object.defineProperty(exports, "abiOUSDToken", { enumerable: true, get: function () { return ABIs_1.abiOUSDToken; } });
Object.defineProperty(exports, "abiCurveOUSDPool", { enumerable: true, get: function () { return ABIs_1.abiCurveOUSDPool; } });
Object.defineProperty(exports, "abiCurveTripool2", { enumerable: true, get: function () { return ABIs_1.abiCurveTripool2; } });
Object.defineProperty(exports, "abiUSDTToken", { enumerable: true, get: function () { return ABIs_1.abiUSDTToken; } });
Object.defineProperty(exports, "abiWETH9Token", { enumerable: true, get: function () { return ABIs_1.abiWETH9Token; } });
Object.defineProperty(exports, "abiCurveFactory", { enumerable: true, get: function () { return ABIs_1.abiCurveFactory; } });
Object.defineProperty(exports, "abi3CRVToken", { enumerable: true, get: function () { return ABIs_1.abi3CRVToken; } });
Object.defineProperty(exports, "abiCurve3Pool", { enumerable: true, get: function () { return ABIs_1.abiCurve3Pool; } });
Object.defineProperty(exports, "abi3PoolImplementation", { enumerable: true, get: function () { return ABIs_1.abi3PoolImplementation; } });
const dotenv_1 = __importDefault(require("dotenv"));
// grab the private api key from the private repo
dotenv_1.default.config({ path: "secrets/alchemy.env" });
/* CONTRACT ADDRESSES ON MAINNET */
const addressCurveTripool2 = "0xd51a44d3fae010294c616388b506acda1bfaae46";
exports.addressCurveTripool2 = addressCurveTripool2;
const addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
exports.addressUSDT = addressUSDT;
const addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
exports.addressWETH9 = addressWETH9;
const addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
exports.addressCurveFactory = addressCurveFactory;
const addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
exports.addressCurve3Pool = addressCurve3Pool;
const addressCurveOUSDPool = "0x87650D7bbfC3A9F10587d7778206671719d9910D";
exports.addressCurveOUSDPool = addressCurveOUSDPool;
const addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
exports.addressOUSD = addressOUSD;
const address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
exports.address3CRV = address3CRV;
const addressUSDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
exports.addressUSDC = addressUSDC;
const addressZap = "0xa79828df1850e8a3a3064576f380d90aecdd3359";
exports.addressZap = addressZap;
const address3CRVlvUSDPool = "0x67C7f0a63BA70a2dAc69477B716551FC921aed00";
exports.address3CRVlvUSDPool = address3CRVlvUSDPool;
const addressCurveRegistry = "0x81C46fECa27B31F3ADC2b91eE4be9717d1cd3DD7";
exports.addressCurveRegistry = addressCurveRegistry;
const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
exports.routeAddress = routeAddress;
const indexTripoolUSDT = 0;
exports.indexTripoolUSDT = indexTripoolUSDT;
const indexTripoolWETH9 = 2;
exports.indexTripoolWETH9 = indexTripoolWETH9;
const indexCurveOUSDOUSD = 0;
exports.indexCurveOUSDOUSD = indexCurveOUSDOUSD;
const indexCurveOUSD3CRV = 1;
exports.indexCurveOUSD3CRV = indexCurveOUSD3CRV;
const defaultBlockNumber = 15104872;
exports.defaultBlockNumber = defaultBlockNumber;
async function helperResetNetwork(lockBlock) {
    const alchemyUrl = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;
    // Reset hardhat mainnet fork
    await hardhat_1.network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: {
                    jsonRpcUrl: alchemyUrl,
                    blockNumber: lockBlock,
                },
            },
        ],
    });
}
exports.helperResetNetwork = helperResetNetwork;
/*
    Fork is starting us with plenty of ETH so
    1. Convert ETH to WETH (because this is what Curve is working with)
    2. WETH->USDT on TriCrypto2@Curve
*/
async function helperSwapETHWithUSDT(destUser, ethAmountToSwap) {
    /// /////////// Loading some contracts //////////////
    // loading WETH9 contract
    const weth9 = new hardhat_1.ethers.Contract(addressWETH9, ABIs_1.abiWETH9Token, destUser);
    // loading USDT contract
    const usdtToken = new hardhat_1.ethers.Contract(addressUSDT, ABIs_1.abiUSDTToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading Tripool2 contract
    const triPool = new hardhat_1.ethers.Contract(addressCurveTripool2, ABIs_1.abiCurveTripool2, destUser);
    // Verify we got the correct TriPool connected (verifying USDT and WETH addresses)
    let ret = await triPool.coins(indexTripoolUSDT);
    (0, chai_1.expect)(ret).to.equal(addressUSDT);
    ret = await triPool.coins(indexTripoolWETH9);
    (0, chai_1.expect)(ret).to.equal(addressWETH9);
    /// /////////// 1. ETH->WETH9 //////////////
    await hardhat_1.ethers.provider.send("evm_mine");
    // read current signer balance from WETH9 contract (so we can validate increase later)
    let weth9Balance = await weth9.balanceOf(destUser.address);
    // ETH->WETH @ WETH9 (becuase looks like tripool only deals with WETH)
    await weth9.deposit({ value: ethAmountToSwap });
    // read balance again and make sure it increased
    (0, chai_1.expect)(await weth9.balanceOf(destUser.address)).to.gt(weth9Balance);
    weth9Balance = await weth9.balanceOf(destUser.address);
    /// /////////// 2. WETH->USDT //////////////
    // approve tripool to spend WETH9 on behalf of destUser
    await weth9.approve(addressCurveTripool2, ethAmountToSwap);
    // get user balance
    let usdtBalance = await usdtToken.balanceOf(destUser.address);
    // Exchange WETH9->USDT
    // See: https://curve.readthedocs.io/factory-pools.html?highlight=exchange#StableSwap.exchange
    // exchange(i: int128, j: int128, dx: uint256, min_dy: uint256, _rcvr: address = msg.sender) → uint256: nonpayable
    // i: Index value of the token to send.
    // j: Index value of the token to receive.
    // dx: The amount of i being exchanged.
    // min_dy: The minimum amount of j to receive. If the swap would result in less, the transaction will revert.
    await triPool.exchange(indexTripoolWETH9, indexTripoolUSDT, ethAmountToSwap, 1);
    await hardhat_1.ethers.provider.send("evm_mine");
    // read balance again and make sure it increased
    (0, chai_1.expect)(await usdtToken.balanceOf(destUser.address)).to.gt(usdtBalance);
    usdtBalance = await usdtToken.balanceOf(destUser.address);
    return usdtBalance;
}
exports.helperSwapETHWithUSDT = helperSwapETHWithUSDT;
/*
    Fork is starting us with plenty of ETH so
    1. Convert ETH to WETH (because this is what Curve is working with)
    2. WETH->USDT on TriCrypto2@Curve
    3. Deposit USDT with 3Pool to get some 3CRV
*/
async function helperSwapETHWith3CRV(destUser, ethAmountToSwap) {
    /// /////////// Loading some contracts //////////////
    // loading USDT contract
    const tokenUSDT = new hardhat_1.ethers.Contract(addressUSDT, ABIs_1.abiUSDTToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading 3CRV token contract
    const token3CRV = new hardhat_1.ethers.Contract(address3CRV, ABIs_1.abi3CRVToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading 3Pool pool contract
    const contractCurve3Pool = new hardhat_1.ethers.Contract(addressCurve3Pool, ABIs_1.abiCurve3Pool, destUser);
    /// /////////// 1. ETH->USDT on Curve /////////////////////////
    const balanceUSDT = await helperSwapETHWithUSDT(destUser, ethAmountToSwap);
    await hardhat_1.ethers.provider.send("evm_mine");
    /// /////////// 2. USDT->3CRV on Curve /////////////////////////
    // approve 3Pool to spend USDT on behalf of destUser
    await tokenUSDT.approve(addressCurve3Pool, balanceUSDT);
    // get user balance
    let balance3CRV = await token3CRV.balanceOf(destUser.address);
    // Exchange USDT->3CRV
    await contractCurve3Pool.add_liquidity([0, 0, balanceUSDT], 1);
    await hardhat_1.ethers.provider.send("evm_mine");
    (0, chai_1.expect)(await token3CRV.balanceOf(destUser.address)).to.gt(balance3CRV);
    balance3CRV = await token3CRV.balanceOf(destUser.address);
    return balance3CRV;
}
exports.helperSwapETHWith3CRV = helperSwapETHWith3CRV;
/*
    Fork is starting us with plenty of ETH so
    1. Convert ETH to WETH (because this is what Curve is working with)
    2. WETH->USDT on TriCrypto2@Curve
    3. USDT->OUSD with OUSD contract
*/
async function helperSwapETHWithOUSD(destUser, ethAmountToSwap) {
    /// ///////// Loading some contracts //////////////
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading USDT contract
    const token3CRV = new hardhat_1.ethers.Contract(address3CRV, ABIs_1.abi3CRVToken, destUser);
    // loading OUSD token contract
    const tokenOUSD = new hardhat_1.ethers.Contract(addressOUSD, ABIs_1.abiOUSDToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading OUSD Swapper contract
    const contractCurveOUSDPool = new hardhat_1.ethers.Contract(addressCurveOUSDPool, ABIs_1.abiCurveOUSDPool, destUser);
    /// /////////// 1. ETH->USDT on Curve /////////////////////////
    const balance3CRV = await helperSwapETHWith3CRV(destUser, ethAmountToSwap);
    await hardhat_1.ethers.provider.send("evm_mine");
    /// /////////// 2. USDT->OUSD with OUSD contract //////////////
    // approve Curve OUSD pool to spend 3CRV on behalf of destUser
    await token3CRV.approve(addressCurveOUSDPool, balance3CRV);
    // get user balance
    let balanceOUSD = await tokenOUSD.balanceOf(destUser.address);
    await hardhat_1.ethers.provider.send("evm_mine");
    // Exchange USDT->OUSD
    await contractCurveOUSDPool.exchange(indexCurveOUSD3CRV, indexCurveOUSDOUSD, balance3CRV, 1);
    // read balance again and make sure it increased
    (0, chai_1.expect)(await tokenOUSD.balanceOf(destUser.address)).to.gt(balanceOUSD);
    balanceOUSD = await tokenOUSD.balanceOf(destUser.address);
    return balanceOUSD;
}
exports.helperSwapETHWithOUSD = helperSwapETHWithOUSD;
const minLiq = bnFromNum(100);
let externalWETH;
function bnFromNum(num, decimal = 18) {
    return hardhat_1.ethers.utils.parseUnits(num.toString(), decimal);
}
exports.bnFromNum = bnFromNum;
function bnFromStr(num, decimal = 18) {
    return hardhat_1.ethers.utils.parseUnits(num.toString(), decimal);
}
exports.bnFromStr = bnFromStr;
function numFromBn(num, decimals = 18) {
    return Number(hardhat_1.ethers.utils.formatUnits(num, decimals));
}
exports.numFromBn = numFromBn;
async function getUserSomeWETH(r) {
    externalWETH = new hardhat_1.ethers.Contract(addressWETH9, ABIs_1.abiWETH9Token, r.owner);
    await hardhat_1.ethers.provider.send("evm_mine");
    let weth9Balance = await externalWETH.balanceOf(r.owner.address);
    await externalWETH.deposit({ value: bnFromNum(1) });
    weth9Balance = await externalWETH.balanceOf(r.owner.address);
    // console.log("weth9Balance: %s", numFromBn(weth9Balance));
}
async function createPair(r) {
    var _a;
    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const uniswapFactory = new hardhat_1.ethers.Contract(factoryAddress, ABIs_1.factoryABI, r.owner);
    const tx = await uniswapFactory.createPair(r.archToken.address, addressWETH9);
    const receipt = await tx.wait();
    const pairCreatedEvent = (_a = receipt.events) === null || _a === void 0 ? void 0 : _a.filter((x) => { return x.event === "PairCreated"; });
    const pairAddress = pairCreatedEvent[0].args.pair;
    const pairToken = new hardhat_1.ethers.Contract(pairAddress, ABIs_1.pairABI, r.owner);
    return pairToken;
}
async function getRouter(r) {
    const routeToken = new hardhat_1.ethers.Contract(routeAddress, ABIs_1.routerABI, r.owner);
    return routeToken;
}
async function addLiquidityToPairViaRouter(r, pairToken) {
    await r.archToken.connect(r.treasurySigner).transfer(r.owner.address, minLiq);
    const routeInstance = await getRouter(r);
    await r.archToken.approve(routeAddress, minLiq);
    await routeInstance.addLiquidityETH(r.archToken.address, minLiq, bnFromNum(100), bnFromNum(0.001), r.owner.address, 1670978314, { value: bnFromNum(0.04) });
    await hardhat_1.ethers.provider.send("evm_mine");
    const reserves = await pairToken.getReserves();
    // console.log("reserves0, r1 : %s %s ", numFromBn(reserves._reserve0), numFromBn(reserves._reserve1))
}
async function createUniswapPool(r) {
    await getUserSomeWETH(r);
    const pairToken = await createPair(r);
    await addLiquidityToPairViaRouter(r, pairToken);
    await hardhat_1.ethers.provider.send("evm_mine");
}
exports.createUniswapPool = createUniswapPool;
