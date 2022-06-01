import { helperSwapETHWithOUSD } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

function parseBN (bigNumValue) {
    return parseFloat(parseFloat(ethers.utils.formatUnits(bigNumValue)).toFixed(5));
}

describe("Exchanger Test suit", function () {
    let owner;
    let r: ContractTestContext;
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
        ousd = r.externalOUSD;
        owner = r.owner;
        exchanger = r.exchanger;
        coordinator = r.coordinator;

        // Fund exchanger
        await r.lvUSDToken.mint(exchanger.address, amountStarting);
        await helperSwapETHWithOUSD(owner, amountStarting);
        await ousd.transfer(exchanger.address, amountStarting);
    });

    describe("Exchanges", function () {
        it("Tests should init with some funds", async function () {
            expect(await r.lvUSDToken.balanceOf(exchanger.address)).eq(amountStarting);
            expect(await ousd.balanceOf(exchanger.address)).eq(amountStarting);
        });

        // TODO test a revert of imbalanced pool

        // Create position
        describe("swapLvUSDforOUSD()", function () {
            it("Should send correct amount LvUSD", async function () {
                await expect(exchanger.swapLvUSDforOUSD(amountToExchange));
                const balanceLvUSD = (await r.lvUSDToken.balanceOf(exchanger.address));
                const expectedLvUSD = (amountStarting.sub(amountToExchange));
                expect(balanceLvUSD).eq(expectedLvUSD);
            });
            it("Should receive correct amount OUSD", async function () {
                await expect(exchanger.swapLvUSDforOUSD(amountToExchange));
                // funds end up at coordinator's address
                const balanceOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                expect(balanceOUSD).closeTo(parseBN(amountToExchange), closeToRange);
            });
        });
        describe("swapOUSDforLvUSD()", function () {
            it("LvUSD balance should increase by closeTo 'amountMinRequired'", async function () {
                await exchanger.swapOUSDforLvUSD(amountToExchange, amountMinRequired);
                // coordinator starts with zero, so we can use the current balance
                const balanceLvUSD = await r.lvUSDToken.balanceOf(coordinator.address);
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
    });
});
