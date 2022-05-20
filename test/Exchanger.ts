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
        await helperResetNetwork(defaultBlockNumber);

        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        ousd = r.externalOUSD;
        owner = r.owner;
        exchanger = r.exchanger;

        // Give the Exchanger some LvUSD
        await r.lvUSD.mint(exchanger.address, ethers.utils.parseEther("100"));
    });

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            const startingBalanceLvUSD = await lvUSD.balanceOf(exchanger.address);
            const amountLvUSDToExchange = ethers.utils.parseEther("3.0");

            // make sure we have LvUSD to exchange
            expect(startingBalanceLvUSD).gt(0);

            await exchanger.xLvUSDforOUSD(amountLvUSDToExchange, owner.address);
            const endingBalanceLvUSD = await lvUSD.balanceOf(exchanger.address);
            expect(endingBalanceLvUSD).eq(startingBalanceLvUSD.sub(amountLvUSDToExchange));
        });

        it("Should swap OUSD for LvUSD", async function () {
            const startingBalanceOUSD = await ousd.balanceOf(exchanger.address);
            const amountOUSDToExchange = ethers.utils.parseEther("3.0");

            // make sure we have OUSD to exchange
            expect(startingBalanceOUSD).gt(0);

            await exchanger.xOUSDforLvUSD(amountOUSDToExchange, owner.address);
            const endingBalanceOUSD = await ousd.balanceOf(exchanger.address);
            expect(endingBalanceOUSD).eq(startingBalanceOUSD.sub(amountOUSDToExchange));
        });
    });
});
