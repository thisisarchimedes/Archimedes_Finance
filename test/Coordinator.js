const { expect } = require("chai");
var helper = require('./MainnetHelper');

/// Need to move this whole block to its own module for DI
let owner;
let addr1;
let addr2;
let coordinator
let tokenVault
let tokenLvUSD
async function setup() {
    [owner, addr1, addr2] = await ethers.getSigners();
    let tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
    let contractVault = await ethers.getContractFactory("VaultOUSD");
    tokenVault
        = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "VOUSD");
    let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
    tokenLvUSD = await contractLvUSD.deploy();
    const contractCoordinator = await ethers.getContractFactory("Coordinator")
    coordinator = await contractCoordinator.deploy(tokenLvUSD.address, tokenVault.address)
}

describe("Coordinator Test suit", function () {
    before(async function () {
        helper.helperResetNetwork(14533286)
        await setup();
    })
    it("Should create Coordinator", async function () {
        /// basic check
        expect(await coordinator.addressOfLvUSDToken()).to.equal(tokenLvUSD.address)
    })
})
