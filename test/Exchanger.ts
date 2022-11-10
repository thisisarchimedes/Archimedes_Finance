import { helperSwapETHWithOUSD, helperSwapETHWith3CRV } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { fundMetapool } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

function parseBN (bigNumValue) {
    return parseFloat(parseFloat(ethers.utils.formatUnits(bigNumValue)).toFixed(5));
}

describe("Exchanger Test suit", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let exchanger;
    let coordinator;
    let ousd;

    // Amount of LvUSD & OUSD exchanger starts with
    const amountStarting = ethers.utils.parseUnits("10.0");

    // Amount of LvUSD / OUSD exchanged in tests
    const amountToExchange = ethers.utils.parseUnits("3.0");
    const amountMinRequired = ethers.utils.parseUnits("2.0");
    const closeToRange = parseBN(amountToExchange.mul(2).div(100)); // 2% fee+slippage

    beforeEach(async function () {
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        ousd = r.externalOUSD;
        owner = r.owner;
        exchanger = r.exchanger;
        coordinator = r.coordinator;

        // Fund exchanger
        await lvUSD.setMintDestination(exchanger.address);
        await lvUSD.mint(amountStarting);
        await helperSwapETHWithOUSD(owner, amountStarting);
        await ousd.transfer(exchanger.address, amountStarting);
    });

    // TODO: need to refactor this method to be able to create a new pool that is imbalanced
    // describe("Should not allow to exchange from very imbalanced pool", function () {
    //     async function fundImbalancedPool() {
    //         const lvUSDAmount = ethers.utils.parseUnits("2");
    //         const crvAmount = ethers.utils.parseUnits("80000");
    //         console.log("1--fundImbalancedPool");
    //         await lvUSD.setMintDestination(exchanger.address);
    //         console.log("2--fundImbalancedPool");
    //         await lvUSD.mint(ethers.utils.parseUnits("1000"));
    //         console.log("3--fundImbalancedPool");
    //         await lvUSD.setMintDestination(owner.address);
    //         console.log("4--fundImbalancedPool");
    //         await lvUSD.mint(lvUSDAmount);
    //         console.log("5--fundImbalancedPool");
    //         await helperSwapETHWith3CRV(r.owner, ethers.utils.parseUnits("70.0"));
    //         console.log("6--fundImbalancedPool");

    //         await fundMetapool(r.curveLvUSDPool.address, [lvUSDAmount, crvAmount], owner, r);
    //         console.log("7--fundImbalancedPool");
    //     }
    //     it("Should not exchange lvUSD to 3CRV if pool is very imbalanced", async function () {
    //         console.log("0--Should not exchange lvUSD to 3CRV if pool is very imbalanced");
    //         await fundImbalancedPool();
    //         console.log("1--Should not exchange lvUSD to 3CRV if pool is very imbalanced");
    //         const promise = exchanger.swapLvUSDforOUSD(ethers.utils.parseUnits("200"));
    //         console.log("2--Should not exchange lvUSD to 3CRV if pool is very imbalanced");

    //         await expect(promise).to.be.revertedWith("Expected return value too big");
    //     });
    // });

    describe("Exchanges", function () {
        it("Tests should init with some funds", async function () {
            expect(await lvUSD.balanceOf(exchanger.address)).eq(amountStarting);
            expect(await ousd.balanceOf(exchanger.address)).eq(amountStarting);
        });

        describe("swapLvUSDforOUSD()", function () {
            it("Should send correct amount LvUSD", async function () {
                await exchanger.swapLvUSDforOUSD(amountToExchange);
                const balanceLvUSD = await lvUSD.balanceOf(exchanger.address);
                const expectedLvUSD = amountStarting.sub(amountToExchange);
                expect(balanceLvUSD).eq(expectedLvUSD);
            });
            it("Should receive correct amount OUSD", async function () {
                await exchanger.swapLvUSDforOUSD(amountToExchange);
                // funds end up at coordinator's address
                const balanceOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                expect(balanceOUSD).closeTo(parseBN(amountToExchange), closeToRange);
            });
        });
        describe("swapOUSDforLvUSD()", function () {
            it("LvUSD balance should increase by closeTo 'amountMinRequired'", async function () {
                await exchanger.swapOUSDforLvUSD(amountToExchange, amountMinRequired);
                // coordinator starts with zero, so we can use the current balance
                const balanceLvUSD = await lvUSD.balanceOf(coordinator.address);
                expect(parseBN(balanceLvUSD)).closeTo(parseBN(amountMinRequired), closeToRange);
            });
            it("Should revert if we dont get enough back (minimumRequired)", async function () {
                // set minimum to 110% of what we send in
                const minReq = amountToExchange.mul(110).div(100);
                await expect(exchanger.swapOUSDforLvUSD(amountToExchange, minReq)).to.be.revertedWith("Not enough OUSD for exchange");
            });
            it("Should transfer remainingOUSD to coordinator", async function () {
                const initOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                // coordinator should start with zero OUSD
                expect(initOUSD).eq(0);

                // send 3 and require 2: expectedRemaining = 1
                const expectedRemaining = parseBN(amountToExchange.sub(amountMinRequired));

                await exchanger.swapOUSDforLvUSD(amountToExchange, amountMinRequired);

                const balanceOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                expect(balanceOUSD).closeTo(expectedRemaining, closeToRange);
            });
        });
        // TODO test that _slippage and _curveGuardPercentage work as intended
    });
});
