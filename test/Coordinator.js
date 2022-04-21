const { expect } = require("chai");
const { ethers } = require("hardhat");
var helper = require('./MainnetHelper');

/// Need to move this whole block to its own module for DI
let owner;
let addr1;
let addr2;
let treasurySigner;
let leverageEngineSigner;
let coordinator;
let tokenVault;
let tokenLvUSD;
let tokenCDP;
let tokenOUSD

async function setup() {
    [owner, addr1, addr2, treasurySigner, leverageEngineSigner] = await ethers.getSigners();
    tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
    let contractVault = await ethers.getContractFactory("VaultOUSD");
    tokenVault
        = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "VOUSD");
    let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
    tokenLvUSD = await contractLvUSD.deploy();
    let contractCDP = await ethers.getContractFactory("CDPosition");
    tokenCDP = await contractCDP.deploy();
    const contractCoordinator = await ethers.getContractFactory("Coordinator")
    coordinator = await contractCoordinator.deploy(tokenLvUSD.address, tokenVault.address, tokenCDP.address, treasurySigner.address)

}

const getDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString())
}

const originationFeeDefaultValue = ethers.utils.parseEther("0.05")
const nftIdFirstPosition = 23681623

describe("Coordinator Test suit", function () {
    before(async function () {
        helper.helperResetNetwork(helper.defaultBlockNumber)
        await setup();
        await helper.helperSwapETHWithOUSD(addr1, ethers.utils.parseEther("1.0"))
    })

    it("Should create Coordinator", async function () {
        /// basic check of contract creation 
        expect(await coordinator.addressOfLvUSDToken()).to.equal(tokenLvUSD.address)
        expect(await coordinator.addressOfVaultOUSDToken()).to.equal(tokenVault.address)
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
