import { helperResetNetwork, helperSwapETHWith3CRV, defaultBlockNumber } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { setupMetapool } from "./CurveHelper";

describe("Exchanger Test suit", function () {
    let exchanger;
    let owner;
    let user1;
    let user2;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;
    let pool;

    beforeEach(async function () {
        // Reset network before tests
        helperResetNetwork(defaultBlockNumber);

        [owner, user1, user2] = await ethers.getSigners();
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        exchanger = r.exchanger;

        // Mint 200 ETH of LvUSD for owner
        await lvUSD.mint(owner.address, ethers.utils.parseEther("200.0"));
        // Swap 200 ETH of 3CRV for owner
        await helperSwapETHWith3CRV(owner, ethers.utils.parseEther("200.0"));

        // setup pool
        pool = setupMetapool(owner, r);
    });

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            expect(true);
        });
        it("Should swap OUSD for LvUSD", async function () {
            expect(true);
        });
    });
});
