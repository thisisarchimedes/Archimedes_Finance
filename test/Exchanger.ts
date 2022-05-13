import { helperResetNetwork, helperSwapETHWith3CRV, defaultBlockNumber } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { createAndFundMetapool } from "./CurveHelper";

describe("Exchanger Test suit", function () {
    let exchanger;
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;
    let pool;

    beforeEach(async function () {
        // Reset network before tests
        helperResetNetwork(defaultBlockNumber);

        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        exchanger = r.exchanger;
        owner = r.owner;

        // Mint 200 ETH of LvUSD for owner
        await lvUSD.mint(owner.address, ethers.utils.parseEther("200.0"));
        // Swap 200 ETH of 3CRV for owner
        await helperSwapETHWith3CRV(owner, ethers.utils.parseEther("200.0"));

        // setup pool
        pool = createAndFundMetapool(owner, r);
    });

    describe("Exchanges", function () {
        // TODO
        it("Should swap LvUSD for OUSD", async function () {
            expect(true);
        });
        // TODO
        it("Should swap OUSD for LvUSD", async function () {
            expect(true);
        });
    });
});
