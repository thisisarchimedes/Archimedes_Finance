import hre from "hardhat";
import { expect } from "chai";

const adminAddress = "0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F";
const baseContractName = "ParameterStoreMock";
const upgradedContractName = "ParameterStoreMockV2";
const deployUpgrade = false;

/// Note : To deploy other contracts, deep changes are needed here. Ping you team mates for help!

before("get factories", async function () {
    this.ParamStore = await hre.ethers.getContractFactory(baseContractName);
    this.ParamStoreV2 = await hre.ethers.getContractFactory(upgradedContractName);
});

it("is deployed", async function () {
    const store = await hre.upgrades.deployProxy(this.ParamStore, [adminAddress], { kind: "uups" });
    expect(await store.version()).to.equal("V1");

    console.log("base contract address is %s", await store.address);

    /// Run this section when you want to test (or actually deploy) an upgrade

    if (deployUpgrade) {
        const storeV2 = await hre.upgrades.upgradeProxy(store, this.ParamStoreV2);
        expect(await storeV2.version()).to.equal("V2");
        console.log("upgraded contract adderess is %s", await storeV2.address);
    }
});
