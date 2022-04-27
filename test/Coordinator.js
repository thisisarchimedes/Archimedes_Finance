const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require('./MainnetHelper');
const { ContractTestContext } = require('./ContractTestContext');


const originationFeeDefaultValue = ethers.utils.parseEther("0.05")

describe("Coordinator Test suit", function () {
    let contractTestContext;
    let coordinator;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber)

        contractTestContext = new ContractTestContext();
        await contractTestContext.setup();

        // Object under test 
        coordinator = contractTestContext.coordinator
    })

    it("Should have default value for treasury address", async function () {
        let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
        expect(returnedTreasuryAddress).to.equal(contractTestContext.treasurySigner.address)
    })

    describe("Change treasury address", function () {
        /// Note : when we have access control, check that only admin can change it
        let newTreasurySigner = ethers.Wallet.createRandom()
        before(async function () {
            await coordinator.changeTreasuryAddress(newTreasurySigner.address);
        })
        it("should have updated treasury address", async function () {
            let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address)
        })
    })

    it("Should have default origination fee value", async function () {
        let defaultOriginationFeeRate = await coordinator.getOriginationFeeRate();
        expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue)
    })

    describe("Change origination fee", function () {
        // Note : when we have access control, check that only admin can change it
        // 0.01 equals to 1%
        let newOriginationFeeRate = ethers.utils.parseEther("0.01")
        before(async function () {
            await coordinator.changeOriginationFeeRate(newOriginationFeeRate)
        })
        it("should have updated treasury address", async function () {
            let returnedOriginationFee = await coordinator.getOriginationFeeRate();
            expect(returnedOriginationFee).to.equal(newOriginationFeeRate)
        })
    })
})
