const { ethers } = require("hardhat");
var mainNetHelper = require("./MainnetHelper");

class ContractTestContext {
    // addresses for different roles
    owner;
    addr1;
    addr2;
    treasurySigner;

    // Archimedes contracts
    coordinator;
    cdp;
    vault;
    lvUSD;

    // External contracts
    externalOUSD;

    constructor() {}

    async setup() {
        [this.owner, this.addr1, this.addr2, this.treasurySigner] = await ethers.getSigners();

        let contractCDP = await ethers.getContractFactory("CDPosition");
        this.cdp = await contractCDP.deploy();

        this.externalOUSD = new ethers.Contract(mainNetHelper.addressOUSD, mainNetHelper.abiOUSDToken, this.owner);
        const contractVault = await ethers.getContractFactory("VaultOUSD");
        this.vault = await contractVault.deploy(this.externalOUSD.address, "VaultOUSD", "VOUSD");
        const contractLvUSD = await ethers.getContractFactory("LvUSDToken");
        this.lvUSD = await contractLvUSD.deploy();
        const contractCoordinator = await ethers.getContractFactory("Coordinator");

        this.coordinator = await contractCoordinator.deploy(
            this.lvUSD.address,
            this.vault.address,
            this.cdp.address,
            this.externalOUSD.address,
            this.treasurySigner.address
        );
    }
}

module.exports = {
    ContractTestContext,
};
