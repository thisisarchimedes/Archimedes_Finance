const { ethers } = require("hardhat");
const mainNetHelper = require("./MainnetHelper");

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
    exchanger;

    // External contracts
    externalOUSD;
    externalUSDT;
    external3CRV;
    external3Pool;
    externalCurveFactory;
    externalCurveZap;

    async setup() {
        [this.owner, this.addr1, this.addr2, this.treasurySigner] = await ethers.getSigners();

        const contractCDP = await ethers.getContractFactory("CDPosition");
        this.cdp = await contractCDP.deploy();

        const contractExchanger = await ethers.getContractFactory("Exchanger");
        this.exchanger = await contractExchanger.deploy();

        this.externalOUSD = await new ethers.Contract(
            mainNetHelper.addressOUSD,
            mainNetHelper.abiOUSDToken,
            this.owner,
        );
        this.externalUSDT = await new ethers.Contract(
            mainNetHelper.addressUSDT,
            mainNetHelper.abiUSDTToken,
            this.owner,
        );
        this.external3CRV = await new ethers.Contract(
            mainNetHelper.address3CRV,
            mainNetHelper.abi3CRVToken,
            this.owner,
        );
        this.external3Pool = await new ethers.Contract(
            mainNetHelper.addressCurve3Pool,
            mainNetHelper.abiCurve3Pool,
            this.owner,
        );
        this.externalCurveFactory = await new ethers.Contract(
            mainNetHelper.addressCurveFactory,
            mainNetHelper.abiCurveFactory,
            this.owner,
        );
        this.externalCurveZap = await new ethers.Contract(
            mainNetHelper.addressCurveZap,
            mainNetHelper.abiCurveZap,
            this.owner,
        );

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

        this.externalLvUSDPool = await mainNetHelper.createCurveMetapool3CRV(this.lvUSD, this.owner);

        // Post init contracts
        // address tokenLvUSD, address tokenCoordinator, address pool3CrvLvUSD
        await this.exchanger.initialize(this.lvUSD.address, this.coordinator.address, this.externalLvUSDPool.address);
        console.log("Setup complete.");
    }
}

module.exports = {
    ContractTestContext,
};
