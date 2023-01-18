"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = __importDefault(require("hardhat"));
const chai_1 = require("chai");
const adminAddress = "0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F";
const baseContractName = "ParameterStoreMock";
const upgradedContractName = "ParameterStoreMockV2";
const deployUpgrade = false;
/// Note : To deploy other contracts, deep changes are needed here. Ping you team mates for help!
before("get factories", async function () {
    this.ParamStore = await hardhat_1.default.ethers.getContractFactory(baseContractName);
    this.ParamStoreV2 = await hardhat_1.default.ethers.getContractFactory(upgradedContractName);
});
it("is deployed", async function () {
    const store = await hardhat_1.default.upgrades.deployProxy(this.ParamStore, [adminAddress], { kind: "uups" });
    (0, chai_1.expect)(await store.version()).to.equal("V1");
    console.log("base contract address is %s", await store.address);
    /// Run this section when you want to test (or actually deploy) an upgrade
    if (deployUpgrade) {
        const storeV2 = await hardhat_1.default.upgrades.upgradeProxy(store, this.ParamStoreV2);
        (0, chai_1.expect)(await storeV2.version()).to.equal("V2");
        console.log("upgraded contract adderess is %s", await storeV2.address);
    }
});
