const { expect } = require("chai");
const { ethers } = require("hardhat");
var helper = require('./MainnetHelper');

/// Need to move this whole block to its own module for DI
let owner;
let addr1;
let addr2;
let treasurySigner;
let coordinator
let tokenVault
let tokenLvUSD

async function setup() {
    [owner, addr1, addr2, treasurySigner] = await ethers.getSigners();
    let tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
    let contractVault = await ethers.getContractFactory("VaultOUSD");
    tokenVault
        = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "VOUSD");
    let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
    tokenLvUSD = await contractLvUSD.deploy();
    const contractCoordinator = await ethers.getContractFactory("Coordinator")
    coordinator = await contractCoordinator.deploy(tokenLvUSD.address, tokenVault.address, treasurySigner.address)
}

const getDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString())
}

const originationFeeDefaultValue = ethers.utils.parseEther("0.05")

describe("Coordinator Test suit", function () {
    before(async function () {
        
        helper.helperResetNetwork(14533286)
        await setup();
    })
    it("Should create Coordinator", async function () {
        /// basic check of contract creation
        expect(await coordinator.addressOfLvUSDToken()).to.equal(tokenLvUSD.address)
        expect(await coordinator.addressOfVaultOUSDToken()).to.equal(tokenVault.address)
    })

    it("Should have default value for treasury address", async function () {
        let defaultTreasuryAddress = await coordinator.getTreasuryAddress();
        expect(defaultTreasuryAddress).to.equal(treasurySigner.address)
    })
    describe("Change treasury address", function () {
        /// Note : when we have access control, check that only admin can change it
        let newTreasuryAddress = ethers.Wallet.createRandom()
        before(async function () {
            await coordinator.changeTreasuryAddress(newTreasuryAddress.address);
            // 0.01 equals to 1%
            // await coordinator.changeOriginationFee(ethers.utils.parseEther("0.01"))
        })
        it("should have updated treasury address", async function () {
            let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(newTreasuryAddress.address)
        })
    })

    it("Should have default origination fee value", async function () {
        let defaultOriginationFee = await coordinator.getOriginationFeeRate();
        expect(defaultOriginationFee).to.equal(originationFeeDefaultValue)
    })

    describe("Change origination fee", function () {
        // Note : when we have access control, check that only admin can change it
        // 0.01 equals to 1%
        let newOriginationFee = ethers.utils.parseEther("0.01")
        before(async function () {
            await coordinator.changeOriginationFeeRate(newOriginationFee)
        })
        it("should have updated treasury address", async function () {
            let returnedOriginationFee = await coordinator.getOriginationFeeRate();
            expect(returnedOriginationFee).to.equal(newOriginationFee)
        })
    })   
})
