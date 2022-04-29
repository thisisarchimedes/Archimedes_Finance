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
    });
});
