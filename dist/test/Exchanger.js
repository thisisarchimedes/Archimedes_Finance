"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MainnetHelper_1 = require("./MainnetHelper");
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ContractTestContext_1 = require("./ContractTestContext");
function parseBN(bigNumValue) {
    return parseFloat(parseFloat(hardhat_1.ethers.utils.formatUnits(bigNumValue)).toFixed(5));
}
describe("Exchanger Test suit", function () {
    let owner;
    let r;
    let lvUSD;
    let exchanger;
    let coordinator;
    let ousd;
    // Amount of LvUSD & OUSD exchanger starts with
    const amountStarting = hardhat_1.ethers.utils.parseUnits("10.0");
    // Amount of LvUSD / OUSD exchanged in tests
    const amountToExchange = hardhat_1.ethers.utils.parseUnits("3.0");
    const amountMinRequired = hardhat_1.ethers.utils.parseUnits("2.0");
    const closeToRange = parseBN(amountToExchange.mul(2).div(100)); // 2% fee+slippage
    beforeEach(async function () {
        // Setup & deploy contracts
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        lvUSD = r.lvUSD;
        ousd = r.externalOUSD;
        owner = r.owner;
        exchanger = r.exchanger;
        coordinator = r.coordinator;
        // Fund exchanger
        await lvUSD.setMintDestination(exchanger.address);
        await lvUSD.mint(amountStarting);
        /// Need to increase
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(owner, amountStarting);
        await ousd.transfer(exchanger.address, amountStarting);
    });
    describe("Exchanges", function () {
        it("Tests should init with some funds", async function () {
            (0, chai_1.expect)(await lvUSD.balanceOf(exchanger.address)).eq(amountStarting);
            (0, chai_1.expect)(await ousd.balanceOf(exchanger.address)).eq(amountStarting);
        });
        describe("swapLvUSDforOUSD()", function () {
            it("Should send correct amount LvUSD", async function () {
                await exchanger.swapLvUSDforOUSD(amountToExchange);
                const balanceLvUSD = await lvUSD.balanceOf(exchanger.address);
                const expectedLvUSD = amountStarting.sub(amountToExchange);
                (0, chai_1.expect)(balanceLvUSD).eq(expectedLvUSD);
            });
            it("Should receive correct amount OUSD", async function () {
                await exchanger.swapLvUSDforOUSD(amountToExchange);
                // funds end up at coordinator's address
                const balanceOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                (0, chai_1.expect)(balanceOUSD).closeTo(parseBN(amountToExchange), closeToRange);
            });
        });
        describe("swapOUSDforLvUSD()", function () {
            it("LvUSD balance should increase by closeTo 'amountMinRequired'", async function () {
                await exchanger.swapOUSDforLvUSD(amountToExchange, amountMinRequired);
                // coordinator starts with zero, so we can use the current balance
                const balanceLvUSD = await lvUSD.balanceOf(coordinator.address);
                (0, chai_1.expect)(parseBN(balanceLvUSD)).closeTo(parseBN(amountMinRequired), closeToRange);
            });
            it("Should revert if we dont get enough back (minimumRequired)", async function () {
                // set minimum to 110% of what we send in
                const minReq = amountToExchange.mul(110).div(100);
                await (0, chai_1.expect)(exchanger.swapOUSDforLvUSD(amountToExchange, minReq)).to.be.revertedWith("Not enough OUSD for exchange");
            });
            it("Should transfer remainingOUSD to coordinator", async function () {
                const initOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                // coordinator should start with zero OUSD
                (0, chai_1.expect)(initOUSD).eq(0);
                // send 3 and require 2: expectedRemaining = 1
                const expectedRemaining = parseBN(amountToExchange.sub(amountMinRequired));
                await exchanger.swapOUSDforLvUSD(amountToExchange, amountMinRequired);
                const balanceOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                (0, chai_1.expect)(balanceOUSD).closeTo(expectedRemaining, closeToRange);
            });
        });
        // TODO test that _slippage and _curveGuardPercentage work as intended
    });
});
