import { expect } from "chai";
import { ethers } from "hardhat";
import { helperResetNetwork, defaultBlockNumber } from "./MainnetHelper";
import { ContractTestContext } from "./ContractTestContext";

describe("ContractTestContext", function () {
    let contractTestContext;

    before(async function () {
        helperResetNetwork(defaultBlockNumber);
        contractTestContext = new ContractTestContext();
        await contractTestContext.setup();
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

        describe("Init methods will be called", async function () {
            it("Should set unlimited allowance for exchange to spend Coordinator's lvUSD", async function () {
                // String in equal is 2^256 -1, max uint256
                expect(await contractTestContext.lvUSD.allowance(
                    contractTestContext.exchanger.address, contractTestContext.coordinator.address))
                    .to.equal("115792089237316195423570985008687907853269984665640564039457584007913129639935");
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
