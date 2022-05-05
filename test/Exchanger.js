const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");

async function printBalances(address, r) {
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

        /// ///////////
        /// ///////////
        /// Copied as a template from MainnetHelper
        /// ///////////
        /// ///////////
        /*
        const indexTripoolUSDT = 0;
        const indexTripoolWETH9 = 2;
        const indexCurveOUSDOUSD = 0;
        const indexCurveOUSD3CRV = 1;

        // loading WETH9 contract
        const weth9 = new ethers.Contract(mainnetHelper.addressWETH9, mainnetHelper.abiWETH9Token, owner);
        // loading USDT contract
        const usdtToken = new ethers.Contract(mainnetHelper.addressUSDT, mainnetHelper.abiUSDTToken, owner);
        // loading Tripool2 contract
        const triPool = new ethers.Contract(mainnetHelper.addressCurveTripool2, mainnetHelper.abiCurveTripool2, owner);

        // Verify we got the correct TriPool connected (verifying USDT and WETH addresses)
        let ret = await triPool.coins(indexTripoolUSDT);
        expect(ret).to.equal(mainnetHelper.addressUSDT);
        ret = await triPool.coins(indexTripoolWETH9);
        expect(ret).to.equal(mainnetHelper.addressWETH9);

        /// /////////// 1. ETH->WETH9 //////////////
        // read current signer balance from WETH9 contract (so we can validate increase later)
        let weth9Balance = await weth9.balanceOf(owner.address);
        // ETH->WETH @ WETH9 (becuase looks like tripool only deals with WETH)
        await weth9.deposit({ value: 60 });
        // read balance again and make sure it increased
        expect(await weth9.balanceOf(owner.address)).to.gt(weth9Balance);
        weth9Balance = await weth9.balanceOf(owner.address);

        /// /////////// 2. WETH->USDT //////////////
        // approve tripool to spend WETH9 on behalf of owner
        await weth9.approve(mainnetHelper.addressCurveTripool2, 999);
        // get user balance
        let usdtBalance = await usdtToken.balanceOf(owner.address);
        await triPool.exchange(indexTripoolWETH9, indexTripoolUSDT, 2, 1);
    */
    });

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            // amount, to, minimum required
            /*
            await exchanger.xLvUSDforOUSD(100, owner.address, 0);
            expect(await LvUSD.balanceOf(owner.address)).to.eq(900);
            */
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
