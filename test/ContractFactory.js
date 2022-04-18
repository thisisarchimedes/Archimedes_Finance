var helper = require('./MainnetHelper');
const { expect } = require("chai");


let owner;
let addr1;
let addr2;
let addrs;

// const coordinator = async () => {

// };

module.exports = {
    coordinator: async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();


        let tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
        let contractVault = await ethers.getContractFactory("VaultOUSD");
        let tokenVault
            = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "VOUSD");

        let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
        let tokenLvUSD = await contractLvUSD.deploy();

        const contractCoordinator = await ethers.getContractFactory("Coordinator")
        tokenCoordinator = await contractCoordinator.deploy(tokenLvUSD.address, tokenVault.address)
        console.log("factory running", tokenCoordinator.address)
        return tokenCoordinator
    }
}