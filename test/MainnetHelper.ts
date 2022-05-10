import { ethers, network } from "hardhat";
import { expect } from "chai";
import {
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveZap,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
    abiStableSwap
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
const addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
const address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const addressStableSwap = "0x5F890841f657d90E081bAbdB532A05996Af79Fe6";

const indexTripoolUSDT = 0;
const indexTripoolWETH9 = 2;
const indexCurveOUSDOUSD = 0;
const indexCurveOUSD3CRV = 1;
const defaultBlockNumber = 14720215;

/* helper functions */
// Spin up a Curve Meta Pool that uses 3CRV
// @param token: ERC20 token balanced in the pool
// @param signer: Signer used to deploy / own the pool
// returns pool object of the newly created CurveMetaPool
async function createCurveMetapool3CRV (token, signer) {
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
    console.log("Deployed metapool at address:" + poolAddress);
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
async function helperSwapETHWithUSDT(destUser, ethAmountToSwap) {
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
async function helperSwapETHWith3CRV(destUser, ethAmountToSwap) {
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

    const balanceUSDT = helperSwapETHWithUSDT(destUser, ethAmountToSwap);

    /// /////////// 2. USDT->3CRV on Curve /////////////////////////

    // approve 3Pool to spend USDT on behalf of destUser
    await tokenUSDT.approve(addressCurve3Pool, balanceUSDT);

    // get user balance
    let balance3CRV = await token3CRV.balanceOf(destUser.address);
    // Exchange USDT->3CRV
    await contractCurve3Pool.add_liquidity([0, 0, balanceUSDT], 1);

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
async function helperSwapETHWithOUSD(destUser, ethAmountToSwap) {
    /// /////////// Loading some contracts //////////////

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading USDT contract
    const token3CRV = new ethers.Contract(address3CRV, abi3CRVToken, destUser);
    // loading OUSD token contract
    const tokenOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, destUser);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore loading OUSD Swapper contract
    const contractCurveOUSDPool = new ethers.Contract(addressCurveOUSDPool, abiCurveOUSDPool, destUser);

    /// /////////// 1. ETH->USDT on Curve /////////////////////////

    const balance3CRV = helperSwapETHWith3CRV(destUser, ethAmountToSwap);

    /// /////////// 2. USDT->OUSD with OUSD contract //////////////

    // approve Curve OUSD pool to spend 3CRV on behalf of destUser
    await token3CRV.approve(addressCurveOUSDPool, balance3CRV);

    // get user balance
    let balanceOUSD = await tokenOUSD.balanceOf(destUser.address);

    // Exchange USDT->OUSD
    await contractCurveOUSDPool.exchange(indexCurveOUSD3CRV, indexCurveOUSDOUSD, balance3CRV, 1);

    // read balance again and make sure it increased
    expect(await tokenOUSD.balanceOf(destUser.address)).to.gt(balanceOUSD);
    balanceOUSD = await tokenOUSD.balanceOf(destUser.address);

    return balanceOUSD;
}

export {
    defaultBlockNumber,

    /* helper functions */
    helperResetNetwork,
    helperSwapETHWithUSDT,
    helperSwapETHWith3CRV,
    helperSwapETHWithOUSD,
    createCurveMetapool3CRV,

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
