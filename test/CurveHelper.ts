import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
    abiOUSDToken,
    abiUSDDToken,
    abiCurveOUSDPool,
    abiCurveUSDDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveZap,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
    abiStableSwap,
} from "./ABIs";
import dotenv from "dotenv";

// grab the private api key from the private repo
dotenv.config({ path: "secrets/alchemy.env" });

/* CONTRACT ADDRESSES ON MAINNET */
const addressCurveTripool2 = "0xd51a44d3fae010294c616388b506acda1bfaae46";
const addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const address3CrvZap = "0xA79828DF1850E8a3A3064576f380D90aECDD3359";
const addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
const addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const addressCurveOUSDPool = "0x87650D7bbfC3A9F10587d7778206671719d9910D";
const addressCurveUSDDPool = "0xe6b5CC1B4b47305c58392CE3D359B10282FC36Ea";
const addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
const addressUSDD = "0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6";
const address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const addressStableSwap = "0x5F890841f657d90E081bAbdB532A05996Af79Fe6";

const indexTripoolUSDT = 0;
const indexTripoolWETH9 = 2;
const indexCurveOUSDOUSD = 0;
const indexCurveOUSD3CRV = 1;
const defaultBlockNumber = 14720215;
const indexCurveLvUSDlvUSD = 0;
const indexCurveLvUSD3CRV = 1;

// Adds liquidity to a Metapool
async function fundMetapool (addressPool, [amountToken1, amountToken2], owner, r) {
    const token3CRV = r.external3CRV;
    await token3CRV.approve(addressPool, ethers.constants.MaxUint256);
    const lvUSD = r.lvUSD;
    await lvUSD.approve(addressPool, ethers.constants.MaxUint256);
    const pool = await getMetapool(addressPool, owner);
    // coin[0] += 8, coin[1] +=7
    await pool.add_liquidity([amountToken1, amountToken2], 1, owner.address);
}

// Swap LvUSD for 3CRV using the Metapool
async function exchangeLvUSDfor3CRV (amountLvUSD, owner) {}

// Swap 3CRV for LvUSD using the Metapool
async function exchange3CRVfor3LvUSD (amountLvUSD, owner) {}

// Creates and Funds a LvUSD/3CRV Metapool
async function setupMetapool () {}

/* helper functions */
// Spin up a Curve Meta Pool that uses 3CRV
// @param token: ERC20 token balanced in the pool
// @param signer: Signer used to deploy / own the pool
// returns address of the new pool
async function createMetapool (token, signer) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore CurvePool Factory
    const factoryCurveMetapool = new ethers.Contract(addressCurveFactory, abiCurveFactory, signer);
    const tokenName = await token.symbol();
    const poolSymbol = tokenName + "3CRV";

    // examples on Mainnet:
    // https://etherscan.io/address/0xB9fC157394Af804a3578134A6585C0dc9cc990d4?method=Deploy_metapool~de7fe3bf
    // https://curve.readthedocs.io/factory-deployer.html#Factory.deploy_metapool
    /*
    _base_pool: Address of the base pool to use within the new metapool.
    _name: Name of the new metapool.
    _symbol: Symbol for the new metapool’s LP token. This value will be concatenated with the base pool symbol.
    _coin: Address of the coin being used in the metapool
    _A: Amplification coefficient
    _fee: Trade fee, given as an integer with 1e10 precision.
    */
    await factoryCurveMetapool.deploy_metapool(addressCurve3Pool, tokenName, poolSymbol, token.address, 1337, 4000000);
    // https://curve.readthedocs.io/factory-deployer.html#Factory.find_pool_for_coins
    // We deployed a 3CRV/lvUSD pool - so we ask Curve Factory to look for pools that can deal with USDT/lvUSD
    // In the future this will be a fixed index we can query instead
    const poolAddress = await factoryCurveMetapool.find_pool_for_coins(addressUSDT, token.address);
    // Return the pool address
    // console.log("Deployed metapool at address:" + poolAddress);
    return poolAddress;
}

// Gets the Metapool by address
// Returns a 3CRVMetapool instance
// We use the 3CRV Base Pool, so we can assume the correct ABI as given in docs:
// https://curve.readthedocs.io/factory-pools.html#implementation-contracts
// @param address: address of the metapool
// @param user: signer or provider used to interact with pool (owner can write)
async function getMetapool (address, user) {
    // We assume its a 3CRV metapool, so we use the 3pool implementation abi
    return await ethers.getContractAt(abiStableSwap, address, user);
}

export {
    /* helper functions */
    createMetapool,
    getMetapool,
    fundMetapool,
    setupMetapool,
    exchangeLvUSDfor3CRV,
    exchange3CRVfor3LvUSD,
    /* addresses */
    addressCurveTripool2,
    addressUSDT,
    addressWETH9,
    address3CrvZap,
    addressCurveFactory,
    addressCurve3Pool,
    addressCurveOUSDPool,
    addressOUSD,
    address3CRV,
    addressStableSwap,
    /* ABIs */
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveZap,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
    abiStableSwap,
    /* other */
    indexTripoolUSDT,
    indexTripoolWETH9,
    indexCurveOUSDOUSD,
    indexCurveOUSD3CRV,
};
