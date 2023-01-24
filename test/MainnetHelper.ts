import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
    abi3PoolImplementation,
    factoryABI,
    routerABI,
    pairABI,
} from "./ABIs";

import dotenv from "dotenv";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers";
import { ContractTestContext } from "./ContractTestContext";

// grab the private api key from the private repo
dotenv.config({ path: "secrets/alchemy.env" });

/* CONTRACT ADDRESSES ON MAINNET */
const addressCurveTripool2 = "0xd51a44d3fae010294c616388b506acda1bfaae46";
const addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
const addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const addressCurveOUSDPool = "0x87650D7bbfC3A9F10587d7778206671719d9910D";
const addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
const address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const addressUSDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const addressZap = "0xa79828df1850e8a3a3064576f380d90aecdd3359";
const address3CRVlvUSDPool = "0x67C7f0a63BA70a2dAc69477B716551FC921aed00";
const addressCurveRegistry = "0x81C46fECa27B31F3ADC2b91eE4be9717d1cd3DD7";
const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const indexTripoolUSDT = 0;
const indexTripoolWETH9 = 2;
const indexCurveOUSDOUSD = 0;
const indexCurveOUSD3CRV = 1;
const defaultBlockNumber = 15104872;

async function helperResetNetwork (lockBlock) {
    const alchemyUrl = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

    // Reset hardhat mainnet fork
    await network.provider.request({
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

/*
    Fork is starting us with plenty of ETH so
    1. Convert ETH to WETH (because this is what Curve is working with)
    2. WETH->USDT on TriCrypto2@Curve
*/
async function helperSwapETHWithUSDT (destUser, ethAmountToSwap) {
    /// /////////// Loading some contracts //////////////

    // loading WETH9 contract
    const weth9 = new ethers.Contract(addressWETH9, abiWETH9Token, destUser);
    // loading USDT contract
    const usdtToken = new ethers.Contract(addressUSDT, abiUSDTToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading Tripool2 contract
    const triPool = new ethers.Contract(addressCurveTripool2, abiCurveTripool2, destUser);

    // Verify we got the correct TriPool connected (verifying USDT and WETH addresses)
    let ret = await triPool.coins(indexTripoolUSDT);
    expect(ret).to.equal(addressUSDT);
    ret = await triPool.coins(indexTripoolWETH9);
    expect(ret).to.equal(addressWETH9);

    /// /////////// 1. ETH->WETH9 //////////////
    await ethers.provider.send("evm_mine");

    // read current signer balance from WETH9 contract (so we can validate increase later)
    let weth9Balance = await weth9.balanceOf(destUser.address);

    // ETH->WETH @ WETH9 (becuase looks like tripool only deals with WETH)
    await weth9.deposit({ value: ethAmountToSwap });

    // read balance again and make sure it increased
    expect(await weth9.balanceOf(destUser.address)).to.gt(weth9Balance);
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
    await ethers.provider.send("evm_mine");

    // read balance again and make sure it increased
    expect(await usdtToken.balanceOf(destUser.address)).to.gt(usdtBalance);
    usdtBalance = await usdtToken.balanceOf(destUser.address);

    return usdtBalance;
}

/*
    Fork is starting us with plenty of ETH so
    1. Convert ETH to WETH (because this is what Curve is working with)
    2. WETH->USDT on TriCrypto2@Curve
    3. Deposit USDT with 3Pool to get some 3CRV
*/
async function helperSwapETHWith3CRV (destUser, ethAmountToSwap) {
    /// /////////// Loading some contracts //////////////

    // loading USDT contract
    const tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading 3CRV token contract
    const token3CRV = new ethers.Contract(address3CRV, abi3CRVToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading 3Pool pool contract
    const contractCurve3Pool = new ethers.Contract(addressCurve3Pool, abiCurve3Pool, destUser);

    /// /////////// 1. ETH->USDT on Curve /////////////////////////

    const balanceUSDT = await helperSwapETHWithUSDT(destUser, ethAmountToSwap);
    await ethers.provider.send("evm_mine");

    /// /////////// 2. USDT->3CRV on Curve /////////////////////////

    // approve 3Pool to spend USDT on behalf of destUser
    await tokenUSDT.approve(addressCurve3Pool, balanceUSDT);

    // get user balance
    let balance3CRV = await token3CRV.balanceOf(destUser.address);
    // Exchange USDT->3CRV
    await contractCurve3Pool.add_liquidity([0, 0, balanceUSDT], 1);
    await ethers.provider.send("evm_mine");

    expect(await token3CRV.balanceOf(destUser.address)).to.gt(balance3CRV);

    balance3CRV = await token3CRV.balanceOf(destUser.address);

    return balance3CRV;
}
/*
    Fork is starting us with plenty of ETH so
    1. Convert ETH to WETH (because this is what Curve is working with)
    2. WETH->USDT on TriCrypto2@Curve
    3. USDT->OUSD with OUSD contract
*/
async function helperSwapETHWithOUSD (destUser: SignerWithAddress, ethAmountToSwap: BigNumber) {
    /// ///////// Loading some contracts //////////////

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading USDT contract
    const token3CRV = new ethers.Contract(address3CRV, abi3CRVToken, destUser);
    // loading OUSD token contract
    const tokenOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading OUSD Swapper contract
    const contractCurveOUSDPool = new ethers.Contract(addressCurveOUSDPool, abiCurveOUSDPool, destUser);

    /// /////////// 1. ETH->USDT on Curve /////////////////////////

    const balance3CRV = await helperSwapETHWith3CRV(destUser, ethAmountToSwap);
    await ethers.provider.send("evm_mine");

    /// /////////// 2. USDT->OUSD with OUSD contract //////////////

    // approve Curve OUSD pool to spend 3CRV on behalf of destUser
    await token3CRV.approve(addressCurveOUSDPool, balance3CRV);

    // get user balance
    let balanceOUSD = await tokenOUSD.balanceOf(destUser.address);
    await ethers.provider.send("evm_mine");

    // Exchange USDT->OUSD
    await contractCurveOUSDPool.exchange(indexCurveOUSD3CRV, indexCurveOUSDOUSD, balance3CRV, 1);

    // read balance again and make sure it increased
    expect(await tokenOUSD.balanceOf(destUser.address)).to.gt(balanceOUSD);
    balanceOUSD = await tokenOUSD.balanceOf(destUser.address);

    return balanceOUSD;
}

const minLiq = bnFromNum(100);
let externalWETH: Contract;
export function bnFromNum (num: number, decimal = 18): BigNumber {
    return ethers.utils.parseUnits(num.toString(), decimal);
}
export function bnFromStr (num: string, decimal = 18): BigNumber {
    return ethers.utils.parseUnits(num.toString(), decimal);
}
export function numFromBn (num: BigNumber, decimals = 18): number {
    return Number(ethers.utils.formatUnits(num, decimals));
}
async function getUserSomeWETH (r: ContractTestContext) {
    externalWETH = new ethers.Contract(addressWETH9, abiWETH9Token, r.owner);
    await ethers.provider.send("evm_mine");
    let weth9Balance = await externalWETH.balanceOf(r.owner.address);
    await externalWETH.deposit({ value: bnFromNum(1) });
    weth9Balance = await externalWETH.balanceOf(r.owner.address);
    // console.log("weth9Balance: %s", numFromBn(weth9Balance));
}
async function createPair (r: ContractTestContext): Contract {
    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const uniswapFactory = new ethers.Contract(factoryAddress, factoryABI, r.owner);
    const tx = await uniswapFactory.createPair(r.archToken.address, addressWETH9);
    const receipt = await tx.wait();
    const pairCreatedEvent = receipt.events?.filter((x) => { return x.event === "PairCreated"; });
    const pairAddress = pairCreatedEvent[0].args.pair;
    const pairToken = new ethers.Contract(pairAddress, pairABI, r.owner);
    return pairToken;
}
async function getRouter (r: ContractTestContext): Contract {
    const routeToken = new ethers.Contract(routeAddress, routerABI, r.owner);
    return routeToken;
}
async function addLiquidityToPairViaRouter (r: ContractTestContext, pairToken: Contract) {
    await r.archToken.connect(r.treasurySigner).transfer(r.owner.address, minLiq);

    const routeInstance = await getRouter(r);

    await r.archToken.approve(routeAddress, minLiq);

    await routeInstance.addLiquidityETH(
        r.archToken.address,
        minLiq,
        bnFromNum(100),
        bnFromNum(0.001),
        r.owner.address,
        1670978314,
        { value: bnFromNum(0.04) }, // The amount in Eth to send to pair, long calc but it is worth 100
    );
    await ethers.provider.send("evm_mine");

    const reserves = await pairToken.getReserves();
}

async function createUniswapPool (r: ContractTestContext) {
    await getUserSomeWETH(r);
    const pairToken = await createPair(r);

    await addLiquidityToPairViaRouter(r, pairToken);

    await ethers.provider.send("evm_mine");
}

export {
    defaultBlockNumber,

    /* helper functions */
    helperResetNetwork,
    helperSwapETHWithUSDT,
    helperSwapETHWith3CRV,
    helperSwapETHWithOUSD,
    createUniswapPool,

    /* addresses */
    addressCurveTripool2,
    addressUSDT,
    addressWETH9,
    addressCurveFactory,
    addressCurve3Pool,
    addressCurveOUSDPool,
    addressOUSD,
    address3CRV,
    addressUSDC,
    addressZap,
    address3CRVlvUSDPool,
    addressCurveRegistry,
    routeAddress,

    /* ABIs */
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
    abi3PoolImplementation,

    /* other */
    indexTripoolUSDT,
    indexTripoolWETH9,
    indexCurveOUSDOUSD,
    indexCurveOUSD3CRV,

};
