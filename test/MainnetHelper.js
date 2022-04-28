const { BigNumber, FixedFormat, FixedNumber, formatFixed, parseFixed } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { BN } = require("@openzeppelin/test-helpers");
const {
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
} = require("../ABIs");

// grab the private api key from the private repo
require("dotenv").config({ path: "secrets/alchemy.env" });
let alchemy_url = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

/* CONTRACT ADDRESSES ON MAINNET */
const addressCurveTripool2 = "0xd51a44d3fae010294c616388b506acda1bfaae46";
const addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
const addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const addressCurveOUSDPool = "0x87650D7bbfC3A9F10587d7778206671719d9910D";
const addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";
const address3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";

const indexTripoolUSDT = 0;
const indexTripoolWETH9 = 2;
const indexCurveOUSDOUSD = 0;
const indexCurveOUSD3CRV = 1;

function parseUnitsBetweenUSDTAndOUSD(usdtAmount) {
    let balanceOfUSDTInNatural = ethers.utils.formatUnits(usdtBalance, 6);
    return ethers.utils.parseUnits(balanceOfUSDTInNatural, 18);
}

/* helper functions */
async function helperResetNetwork(lockBlock) {
    // Reset hardhat mainnet fork
    await network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: {
                    jsonRpcUrl: alchemy_url,
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
    ////////////// Loading some contracts //////////////

    // loading WETH9 contract
    const weth9 = new ethers.Contract(addressWETH9, abiWETH9Token, destUser);
    // loading USDT contract
    const usdtToken = new ethers.Contract(addressUSDT, abiUSDTToken, destUser);
    // loading Tripool2 contract
    const triPool = new ethers.Contract(addressCurveTripool2, abiCurveTripool2, destUser);

    // Verify we got the correct TriPool connected (verifying USDT and WETH addresses)
    ret = await triPool.coins(indexTripoolUSDT);
    expect(ret).to.equal(addressUSDT);
    ret = await triPool.coins(indexTripoolWETH9);
    expect(ret).to.equal(addressWETH9);

    ////////////// 1. ETH->WETH9 //////////////

    // read current signer balance from WETH9 contract (so we can validate increase later)
    weth9Balance = await weth9.balanceOf(destUser.address);

    // ETH->WETH @ WETH9 (becuase looks like tripool only deals with WETH)
    await weth9.deposit({ value: ethAmountToSwap });

    // read balance again and make sure it increased
    expect(await weth9.balanceOf(destUser.address)).to.gt(weth9Balance);
    weth9Balance = await weth9.balanceOf(destUser.address);

    ////////////// 2. WETH->USDT //////////////

    // approve tripool to spend WETH9 on behalf of destUser
    await weth9.approve(addressCurveTripool2, ethAmountToSwap);

    // get user balance
    usdtBalance = await usdtToken.balanceOf(destUser.address);

    // Exchange WETH9->USDT
    // See: https://curve.readthedocs.io/factory-pools.html?highlight=exchange#StableSwap.exchange
    // exchange(i: int128, j: int128, dx: uint256, min_dy: uint256, _receiver: address = msg.sender) → uint256: nonpayable
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
    ////////////// Loading some contracts //////////////

    // loading USDT contract
    const tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, destUser);
    // loading 3CRV token contract
    const token3CRV = new ethers.Contract(address3CRV, abi3CRVToken, destUser);
    // loading 3Pool pool contract
    const contractCurve3Pool = new ethers.Contract(addressCurve3Pool, abiCurve3Pool, destUser);

    ////////////// 1. ETH->USDT on Curve /////////////////////////

    balanceUSDT = helperSwapETHWithUSDT(destUser, ethAmountToSwap);

    ////////////// 2. USDT->3CRV on Curve /////////////////////////

    // approve 3Pool to spend USDT on behalf of destUser
    await tokenUSDT.approve(addressCurve3Pool, balanceUSDT);

    // get user balance
    balance3CRV = await token3CRV.balanceOf(destUser.address);
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
    ////////////// Loading some contracts //////////////

    // loading USDT contract
    const token3CRV = new ethers.Contract(address3CRV, abi3CRVToken, destUser);
    // loading OUSD token contract
    const tokenOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, destUser);
    // loading OUSD Swapper contract
    const contractCurveOUSDPool = new ethers.Contract(addressCurveOUSDPool, abiCurveOUSDPool, destUser);

    ////////////// 1. ETH->USDT on Curve /////////////////////////

    balance3CRV = helperSwapETHWith3CRV(destUser, ethAmountToSwap);

    ////////////// 2. USDT->OUSD with OUSD contract //////////////

    // approve Curve OUSD pool to spend 3CRV on behalf of destUser
    await token3CRV.approve(addressCurveOUSDPool, balance3CRV);

    // get user balance
    balanceOUSD = await tokenOUSD.balanceOf(destUser.address);

    // Exchange USDT->OUSD
    await contractCurveOUSDPool.exchange(indexCurveOUSD3CRV, indexCurveOUSDOUSD, balance3CRV, 1);

    // read balance again and make sure it increased
    expect(await tokenOUSD.balanceOf(destUser.address)).to.gt(balanceOUSD);
    balanceOUSD = await tokenOUSD.balanceOf(destUser.address);

    return balanceOUSD;
}

module.exports = {
    /* helper functions */
    helperResetNetwork,
    helperSwapETHWithUSDT,
    helperSwapETHWith3CRV,
    helperSwapETHWithOUSD,

    /* addresses */
    addressCurveTripool2,
    addressUSDT,
    addressWETH9,
    addressCurveFactory,
    addressCurve3Pool,
    addressCurveOUSDPool,
    addressOUSD,
    address3CRV,

    /* ABIs */
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,

    /* other */
    indexTripoolUSDT,
    indexTripoolWETH9,
    indexCurveOUSDOUSD,
    indexCurveOUSD3CRV,
};
