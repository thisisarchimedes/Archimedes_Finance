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

        // Create position
        describe("xLvUSDforOUSD()", function () {
            it("Should send & receive correct amounts", async function () {
                await exchanger.xLvUSDforOUSD(amountToExchange, exchanger.address);
                const balanceLvUSD = (await lvUSD.balanceOf(exchanger.address));
                const expectedLvUSD = (amountStarting.sub(amountToExchange));
                expect(balanceLvUSD).eq(expectedLvUSD);
                const balanceOUSD = (await ousd.balanceOf(exchanger.address));
                const expectedOUSD = parseBN(amountStarting.add(amountToExchange));
                // console.log("%s LvUSD => %s OUSD", parseBN(amountToExchange), parseBN(balanceOUSD.sub(amountStarting)));
                // console.log("delta", parseBN(amountToExchange) - parseBN(balanceOUSD.sub(amountStarting)));
                // console.log("bal lvUSD: %s, expected lvUSD: %s", parseBN(balanceLvUSD), parseBN(expectedLvUSD));
                // console.log("bal OUSD: %s, expected OUSD: %s", parseBN(balanceOUSD), parseBN(expectedOUSD));
                expect(parseBN(balanceOUSD)).closeTo(expectedOUSD, closeToRange);
            });
        });
        describe("xOUSDforLvUSD()", function () {
            it("Should only use min needed to unwind", async function () {
                // send 3 OUSD and require at least 2 LvUSD back
                await exchanger.xOUSDforLvUSD(amountToExchange, owner.address, amountMinRequired);
                const balanceOUSD = await ousd.balanceOf(exchanger.address);
                const amountUsed = amountStarting.sub(balanceOUSD);
                const remainingOUSD = parseBN(amountToExchange.sub(amountUsed));
                const expectedRemaining = parseBN(amountToExchange.sub(amountMinRequired));
                // console.log("Remaining OUSD %s, expectedRemaining %s:", remainingOUSD, expectedRemaining);
                // console.log("delta", expectedRemaining - remainingOUSD);
                expect(remainingOUSD).closeTo(expectedRemaining, closeToRange);
            });
            it("LvUSD balance should increase by closeTo 'amountMinRequired'", async function () {
                await exchanger.xOUSDforLvUSD(amountToExchange, owner.address, amountMinRequired);
                const balanceLvUSD = parseBN(await lvUSD.balanceOf(exchanger.address));
                const expectedLvUSD = parseBN(amountStarting.add(amountMinRequired));
                // console.log("Remaining LvUSD %s, expectedLvUSD %s:", balanceLvUSD, expectedLvUSD);
                // console.log("delta", balanceLvUSD - expectedLvUSD);
                expect(balanceLvUSD).closeTo(expectedLvUSD, closeToRange);
            });
            it("End funds should be under Coordinator address", async function () {
                // TODO
                return true;
            });
        });
    });
});
