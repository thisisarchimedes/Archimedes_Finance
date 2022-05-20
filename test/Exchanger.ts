import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("Exchanger Test suit", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let exchanger;
    let ousd;

    // Amount of LvUSD & OUSD exchanger starts with
    const amountStarting = ethers.utils.parseEther("5.0");

    // Amount of LvUSD / OUSD exchanged in tests
    const amountToExchange = ethers.utils.parseEther("3.0");
    const amountMinRequired = ethers.utils.parseEther("2.0");

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
        ousd.transfer(exchanger.address, amountStarting);
    });

    describe("Exchanges", function () {
        it("Tests should init with some funds", async function () {
            expect(await lvUSD.balanceOf(exchanger.address)).eq(amountStarting);
            expect(await ousd.balanceOf(exchanger.address)).eq(amountStarting);
        });
        it("Should swap LvUSD for OUSD", async function () {
            await exchanger.xLvUSDforOUSD(amountToExchange, owner.address);
            const finalBalance = await lvUSD.balanceOf(exchanger.address);
            expect(finalBalance).eq(amountStarting.sub(amountToExchange));
            expect(await ousd.balanceOf(exchanger.address)).gt(amountStarting);
        });
        // it("Should swap OUSD for LvUSD", async function () {
        //     await exchanger.xOUSDforLvUSD(amountToExchange, owner.address, amountMinRequired);
        //     const finalBalance = await ousd.balanceOf(exchanger.address);
        //     expect(finalBalance).eq(amountStarting.sub(amountToExchange));
        //     expect(await lvUSD.balanceOf(exchanger.address)).gt(amountStarting);
        // });
    });
});
