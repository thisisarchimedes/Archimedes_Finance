const { expect } = require("chai");
var contracts = require('./ContractFactory');
var helper = require('./MainnetHelper');


describe("Coordinator Test suit", function () {
    // let tokenCoordinator
    // let owner;
    // let addr1;
    // let addr2;
    // let addrs;

    // before(async function () {
    //     [owner, addr1, addr2, ...addrs] = await ethers.getSigners();


    //     let tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
    //     let contractVault = await ethers.getContractFactory("VaultOUSD");
    //     let tokenVault
    //         = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "VOUSD");

    //     let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
    //     let tokenLvUSD = await contractLvUSD.deploy();

    //     const contractCoordinator = await ethers.getContractFactory("Coordinator")
    //     tokenCoordinator = await contractCoordinator.deploy(tokenLvUSD.address, tokenVault.address)

    // })
    it("Should create Coordinator", async function () {
        expect(await contracts.coordinator().addressOfLvUSDToken()).to.equal("something")

        // expect(await tokenCoordinator.addressOfLvUSDToken()).to.equal("something")
    })
})
