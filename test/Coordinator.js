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
        expect(returnedTreasuryAddress).to.equal(treasurySigner.address)

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

    describe("Deposit collateral into new NFT position (NFT already exist)", function () {
        /// depositing collateral need to transfer funds to vault, create a new CDP entry with valid values
        let collateralAmount = ethers.utils.parseEther("500")

        before(async function () {
            /// important implementation detail - we when customer call createLeveragePosition we transfer funds from user's account to the leverage engine (or another calling contract). For this test, we'll set leverage engine as addr2
            await tokenOUSD.connect(addr1).transfer(leverageEngineSigner.address, collateralAmount)
            expect(await tokenOUSD.balanceOf(leverageEngineSigner.address)).to.equal(collateralAmount)
            console.log("some senders to look at  coordinator %s owner %s", coordinator.address, owner.address)
            /// now we can deposit from coordinator to vault. Trying to connect as coordinator
            await coordinator.connect(leverageEngineSigner).depositCollateralUnderNFT(nftIdFirstPosition, collateralAmount, addr2.address)
        })
        it("Should have taken OUSD from out under the coordinator address", async function () {
            expect(await tokenOUSD.balanceOf(leverageEngineSigner.address)).to.equal(0)
        })
        // it("Should have increased OUSD in the vault", async function () {
        //     expect(await tokenVault.totalAssets()).to.equal(collateralAmount)
        // })
    })
})
