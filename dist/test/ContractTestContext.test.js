"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ContractTestContext_1 = require("./ContractTestContext");
describe("ContractTestContext", function () {
    let contractTestContext;
    before(async function () {
        contractTestContext = await (0, ContractTestContext_1.buildContractTestContext)();
    });
    describe("When context is initialized", () => {
        describe("Coordinator will be initialized", async function () {
            let coordinator;
            beforeEach(() => {
                coordinator = contractTestContext.coordinator;
            });
            it("coordinator has a LvUSDToken address", async function () {
                (0, chai_1.expect)(await coordinator.addressOfLvUSDToken()).to.equal(contractTestContext.lvUSD.address);
            });
            it("coordinator has a OUSD contract address", async function () {
                (0, chai_1.expect)(await coordinator.addressOfVaultOUSDToken()).to.equal(contractTestContext.vault.address);
            });
        });
    });
    describe("Basic contract import functions", async function () {
        it("Should be defined if contract exists", async function () {
            // String in equal is 2^256 -1, max uint256
            await (0, chai_1.expect)(contractTestContext.coordinator).to.not.be.undefined;
        });
        it("Should be undefined if contract does not exist", async function () {
            // String in equal is 2^256 -1, max uint256
            let contract;
            try {
                contract = await hardhat_1.ethers.getContractFactory("sdjkfnsdkfjnsfn");
            }
            catch (e) { }
            await (0, chai_1.expect)(contract).to.be.undefined;
        });
    });
});
