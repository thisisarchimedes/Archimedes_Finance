import { helperResetNetwork, helperSwapETHWith3CRV, defaultBlockNumber } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("Exchanger Test suit", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;

    beforeEach(async function () {
        // Reset network before tests
        await helperResetNetwork(defaultBlockNumber);

        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        owner = r.owner;

        // Mint 200 ETH of LvUSD for owner
        await lvUSD.mint(owner.address, ethers.utils.parseUnits("200.0"));
        // Swap 200 ETH of 3CRV for owner
        await helperSwapETHWith3CRV(owner, ethers.utils.parseUnits("200.0"));
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
