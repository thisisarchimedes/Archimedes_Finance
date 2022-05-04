const { expect } = require("chai");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");

describe("ContractTestContext", function () {
    let contractTestContext;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);
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
});
