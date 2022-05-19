import { helperResetNetwork, helperSwapETHWith3CRV, defaultBlockNumber } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("Exchanger Test suit", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let exchanger;
    let ousd;

    beforeEach(async function () {
        // Reset network before tests
        helperResetNetwork(defaultBlockNumber);
        console.log("buildContractTestContext...");

        // Setup & deploy contracts
        r = await buildContractTestContext();
        console.log("buildContractTestContext complete");
        lvUSD = r.lvUSD;
        ousd = r.externalOUSD;
        owner = r.owner;
        exchanger = r.exchanger;

        // Give the Exchanger some LvUSD
        await r.lvUSD.mint(exchanger.address, ethers.utils.parseEther("100"));
    });

    describe("Exchanges", function () {
        // TODO
        // it("Should swap OUSD for LvUSD", async function () {
        //     const balanceLvUSD = await lvUSD.balanceOf(owner.address);
        //     const balanceOUSD = await ousd.balanceOf(owner.address);
        //     console.log("owner balance lvusd, ousd: %s, %s", balanceLvUSD, balanceOUSD);
        //     const returnedLvUSD = await exchanger.xOUSDforLvUSD(ethers.utils.parseEther("3.0"), owner.address);
        //     console.log("returnedLvUSD", returnedLvUSD);
        // });
        // TODO
        it("Should swap LvUSD for OUSD", async function () {
            console.log("lvusd dec", await lvUSD.decimals());
            const balanceLvUSD = await lvUSD.balanceOf(owner.address);
            const balanceOUSD = await ousd.balanceOf(owner.address);
            console.log("owner balance lvusd, ousd: %s, %s", balanceLvUSD, balanceOUSD);
            const returnedOUSD = await exchanger.xLvUSDforOUSD(ethers.utils.parseEther("3.0"), owner.address);
            console.log("returnedOUSD", returnedOUSD);
        });
    });
});
