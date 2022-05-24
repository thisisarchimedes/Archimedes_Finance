import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
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
    const amountStarting = ethers.utils.parseEther("10.0");

    // Amount of LvUSD / OUSD exchanged in tests
    const amountToExchange = ethers.utils.parseEther("3.0");
    const amountMinRequired = ethers.utils.parseEther("2.0");
    const closeToRange = parseBN(amountToExchange.mul(2).div(100)); // 2% fee+slippage

    beforeEach(async function () {
        // Reset network before tests
        await helperResetNetwork(defaultBlockNumber);

        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        ousd = r.externalOUSD;
        owner = r.owner;
        exchanger = r.exchanger;
        coordinator = r.coordinator;

        // Fund exchanger
        await lvUSD.mint(exchanger.address, amountStarting);
        await helperSwapETHWithOUSD(owner, amountStarting);
        await ousd.transfer(exchanger.address, amountStarting);
    });

    describe("Exchanges", function () {
        it("Tests should init with some funds", async function () {
            expect(await lvUSD.balanceOf(exchanger.address)).eq(amountStarting);
            expect(await ousd.balanceOf(exchanger.address)).eq(amountStarting);
        });

        // TODO test a revert of imbalanced pool

        // Create position
        describe("swapLvUSDforOUSD()", function () {
            beforeEach(async function () {
                await exchanger.swapLvUSDforOUSD(amountToExchange);
            });
            it("Should send correct amount LvUSD", async function () {
                const balanceLvUSD = (await lvUSD.balanceOf(exchanger.address));
                const expectedLvUSD = (amountStarting.sub(amountToExchange));
                expect(balanceLvUSD).eq(expectedLvUSD);
            });
            it("Should receive correct amount OUSD", async function () {
                // funds end up at coordinator's address
                const balanceOUSD = parseBN(await ousd.balanceOf(coordinator.address));
                expect(balanceOUSD).closeTo(parseBN(amountToExchange), closeToRange);
            });
        });
        describe("swapOUSDforLvUSD()", function () {
            it("LvUSD balance should increase by closeTo 'amountMinRequired'", async function () {
                await exchanger.swapOUSDforLvUSD(amountToExchange, amountMinRequired);
                const balanceLvUSD = await lvUSD.balanceOf(coordinator.address);
                expect(parseBN(balanceLvUSD)).closeTo(parseBN(amountMinRequired), closeToRange);
            });
            it("Should revert if we dont get enough back (minimumRequired)", async function () {
                // set minimum to 110% of what we send in
                const minReq = amountToExchange.mul(110).div(100);
                await expect(exchanger.swapOUSDforLvUSD(amountToExchange, minReq)).to.be.revertedWith("Not enough OUSD for exchange");
            });
        });
    });
});
