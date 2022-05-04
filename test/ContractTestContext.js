const { ethers } = require("hardhat");
const mainNetHelper = require("./MainnetHelper");

class ContractTestContext {
    // addresses for different roles
    owner;
    addr1;
    addr2;
    addr3;
    treasurySigner;

    // Archimedes contracts
    coordinator;
    cdp;
    vault;
    lvUSD;
    exchanger;

    // External contracts
    externalOUSD;

    async setup () {
        [this.owner, this.addr1, this.addr2, this.treasurySigner, this.addr3] = await ethers.getSigners();

        const contractCDP = await ethers.getContractFactory("CDPosition");
        this.cdp = await contractCDP.deploy();

        const contractExchanger = await ethers.getContractFactory("Exchanger");
        this.exchanger = await contractExchanger.deploy();

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
            this.exchanger.address,
            this.treasurySigner.address,
        );
        // Post init contracts
        await this.exchanger.init(this.lvUSD.address, this.coordinator.address);
    }
}

module.exports = {
    ContractTestContext,
};
