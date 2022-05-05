const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");

async function printBalances (address, r) {
    const _eth = await ethers.provider.getBalance(address);
    const _lvusd = await r.lvUSD.balanceOf(address);
    const _ousd = await r.externalOUSD.balanceOf(address);
    const _usdt = await r.externalUSDT.balanceOf(address);
    const _3crv = await r.external3CRV.balanceOf(address);
    console.log(
        ">>> ether:" +
            parseInt(ethers.utils.formatEther(_eth)).toFixed(1) +
            " lvusd:" +
            parseInt(ethers.utils.formatUnits(_lvusd, 18)).toFixed(1) +
            " ousd:" +
            parseInt(ethers.utils.formatUnits(_ousd, 18)).toFixed(1) +
            " usdt:" +
            parseInt(ethers.utils.formatUnits(_usdt, 6)).toFixed(1) +
            " 3crv:" +
            parseInt(ethers.utils.formatUnits(_3crv, 18)).toFixed(1),
    );
}

describe("Exchanger Test suit", function () {
    let r;
    let exchanger;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);
        [owner, user1, user2, ...users] = await ethers.getSigners();
        r = new ContractTestContext();
        await r.setup();
        // Output test

        // Object under test
        exchanger = r.exchanger;

        // Mint some LvUSD to owner
        await r.lvUSD.mint(owner.address, ethers.utils.parseEther("1000"));
        console.log("Minted 1000 LvUSD");
        await printBalances(owner.address, r);

        // Exchange 2 ETH to USDT
        const balanceUSDT = await mainnetHelper.helperSwapETHWithUSDT(owner, ethers.utils.parseEther("2"));
        console.log("Swapped 2 ETH => ~" + parseFloat(ethers.utils.formatUnits(balanceUSDT, 6)).toFixed(2) + " USDT");
        // await printBalances(owner.address, r);

        // Exchange some USDT for 3CRV
        const USDTliquidity = balanceUSDT.div(2);
        await r.externalUSDT.approve(r.externalLvUSDPool.address, ethers.constants.MaxUint256);
        console.log("Approved LvUSDPool: USDT");
        // amount of [dai, usdc, usdt]. we deposit usdt, so [0,0,x]
        console.log("underlying:", await r.externalCurveFactory.get_underlying_balances(r.externalLvUSDPool.address));
        // _pool (address), _deposit_amounts (uint256[4]), _min_mint_amount (uint256)
        await r.externalUSDT.approve(r.externalCurveZap.address, ethers.constants.MaxUint256);
        console.log(await r.externalCurveZap);
        await r.externalCurveZap.add_liquidity(r.externalLvUSDPool.address, [0, 0, USDTliquidity, 0], 0);
        console.log(
            "Added liquidity: ~" + parseFloat(ethers.utils.formatUnits(USDTliquidity, 6)).toFixed(2) + "USDT into pool",
        );
        await printBalances(owner.address, r);

        console.log(
            "get_underlying_balances() of pool:",
            await r.externalCurveFactory.get_underlying_balances(r.externalLvUSDPool.address),
        );

        /**
         * @param _pool: Address of the pool to deposit into.
         * @param _deposit_amounts: List of amounts of underlying coins to deposit. Amounts correspond to the tokens at the same index locations within Factory.get_underlying_coins.
         * @param _min_mint_amount: Minimum amount of LP tokens to mint from the deposit.
         * @param _receiver: Optional address that receives the LP tokens. If not specified, they are sent to the caller.
         * @dev Returns the amount of LP tokens that were minted in the deposit.
         */

        /** example
         * amounts = [1e18, 1e18, 1e6, 1e6]
         * expected = zap.calc_token_amount(pool, amounts, True) * 0.99
         * zap.add_liquidity(pool, amounts, expected, {'from': alice})
         */
        /// calc_token_amount(_amounts: uint256[2], _is_deposit: bool)
        // await curveZap.calc_token_amount(metapoolLvUSD.address, [0, 0, 0, balanceUSDT], 0);
        // console.log("zapped");
        // console.log("USDT balance:", await lvUSD.balanceOf(owner.address));
    });

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            // amount, to, minimum required
            await exchanger.xLvUSDforOUSD(100, owner.address, 0);
            expect(await LvUSD.balanceOf(owner.address)).to.eq(900);
        });
        it("Should swap OUSD for LvUSD", async function () {
            // @param: amount OUSD
            // @param: minAmount returned LVUSD
            // await exchanger.xOUSDforLvUSD(100, 90);
            // amount, to, minimum required
            // expect(await LvUSD.balanceOf(owner.address)).to.eq(0);
        });
    });
});
