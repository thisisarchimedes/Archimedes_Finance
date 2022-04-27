const {
    BigNumber,
    FixedFormat,
    FixedNumber,
    formatFixed,
    parseFixed,
} = require("@ethersproject/bignumber");
const { expect } = require("chai");
const {
    abiOUSDToken,
    abiOUSDSwap,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
} = require("./ABIs");

// grab the private api key from the private repo
require("dotenv").config({ path: "secrets/alchemy.env" });
let alchemy_url =
    "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

/* CONTRACT ADDRESSES ON MAINNET */
const addressCurveTripool2 = "0xd51a44d3fae010294c616388b506acda1bfaae46";
const addressUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const addressWETH9 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const addressCurveFactory = "0xB9fC157394Af804a3578134A6585C0dc9cc990d4";
const addressCurve3Pool = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";
const addressOUSDSwap = "0xcecad69d7d4ed6d52efcfa028af8732f27e08f70";
const addressOUSD = "0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86";

const indexTripoolUSDT = 0;
const indexTripoolWETH9 = 2;

module.exports = {
    /* helper functions */
    helperResetNetwork: async function (lockBlock) {
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
    },

    /*
        Fork is starting us with plenty of ETH so
        1. Convert ETH to WETH (because this is what Curve is working with)
        2. WETH->USDT on TriCrypto2@Curve
        3. USDT->OUSD with OUSD contract
    */
    helperSwapETHWithOUSD: async function (destUser, ethAmountToSwap) {
        ////////////// Loading some contracts //////////////

        // loading WETH9 contract
        const weth9 = new ethers.Contract(
            addressWETH9,
            abiWETH9Token,
            destUser
        );
        // loading USDT contract
        const usdtToken = new ethers.Contract(
            addressUSDT,
            abiUSDTToken,
            destUser
        );
        // loading Tripool2 contract
        const triPool = new ethers.Contract(
            addressCurveTripool2,
            abiCurveTripool2,
            destUser
        );
        // loading OUSD token contract
        const ousdToken = new ethers.Contract(
            addressOUSD,
            abiOUSDToken,
            destUser
        );
        // loading OUSD Swapper contract
        const ousdSwapper = new ethers.Contract(
            addressOUSDSwap,
            abiOUSDSwap,
            destUser
        );

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
        await triPool.exchange(
            indexTripoolWETH9,
            indexTripoolUSDT,
            ethAmountToSwap,
            1
        );

        // read balance again and make sure it increased
        expect(await usdtToken.balanceOf(destUser.address)).to.gt(usdtBalance);
        usdtBalance = await usdtToken.balanceOf(destUser.address);

        ////////////// 3. USDT->OUSD with OUSD contract //////////////

        // approve OUSD Swapper to spend USDT on behalf of destUser
        await usdtToken.approve(addressOUSDSwap, usdtBalance);

        // get user balance
        ousdBalance = await ousdToken.balanceOf(destUser.address);

        // Exchange USDT->OUSD
        // https://github.com/OriginProtocol/origin-dollar/blob/e9ef066ab5cd8842d044e7759b99d956a44acd47/contracts/contracts/flipper/Flipper.sol
        await ousdSwapper.buyOusdWithUsdt(usdtBalance);

        // read balance again and make sure it increased
        expect(await ousdToken.balanceOf(destUser.address)).to.gt(ousdBalance);
        ousdBalance = await ousdToken.balanceOf(destUser.address);
    },
    addressCurveTripool2,
    addressUSDT,
    addressWETH9,
    addressCurveFactory,
    addressCurve3Pool,
    addressOUSDSwap,
    addressOUSD,
    indexTripoolUSDT,
    indexTripoolWETH9,
    abiOUSDToken,
    abiOUSDSwap,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
};
