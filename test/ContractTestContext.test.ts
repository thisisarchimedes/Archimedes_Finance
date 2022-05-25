import { expect } from "chai";
import { ethers } from "hardhat";
import { helperResetNetwork, defaultBlockNumber } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("ContractTestContext", function () {
    let contractTestContext: ContractTestContext;

    before(async function () {
        await helperResetNetwork(defaultBlockNumber);
        contractTestContext = await buildContractTestContext();
    });

    describe("When context is initialized", () => {
        describe("Coordinator will be initialized", async function () {
            let coordinator;

            beforeEach(() => {
                coordinator = contractTestContext.coordinator;
            });

            it("coordinator has a LvUSDToken address", async function () {
                expect(await coordinator.addressOfLvUSDToken()).to.equal(contractTestContext.lvUSD.address);
            });

            it("coordinator has a OUSD contract address", async function () {
                expect(await coordinator.addressOfVaultOUSDToken()).to.equal(contractTestContext.vault.address);
            });
        });
    });

    describe("Basic contract import functions", async function () {
        it("Should be defined if contract exists", async function () {
            // String in equal is 2^256 -1, max uint256
            await expect(contractTestContext.coordinator).to.not.be.undefined;
        });
        it("Should be undefined if contract does not exist", async function () {
            // String in equal is 2^256 -1, max uint256
            let contract;
            try {
                contract = await ethers.getContractFactory("sdjkfnsdkfjnsfn");
            } catch (e) {}
            await expect(contract).to.be.undefined;
        });
    });
});
