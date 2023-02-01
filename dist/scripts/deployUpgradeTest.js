"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = __importStar(require("hardhat"));
const ethers_1 = require("ethers");
const chai_1 = require("chai");
const IntegrationTestContext_1 = require("../integrationTests/IntegrationTestContext");
const About4700ETH = "0x1000000000000000000";
const adminAddress = "0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F";
before("get factories", async function () {
    this.adminSigner = await (0, IntegrationTestContext_1.impersonateAccount)(adminAddress);
    await (0, IntegrationTestContext_1.fundAccount)(adminAddress, About4700ETH);
    this.ParamStore = await hardhat_1.default.ethers.getContractFactory("ParameterStoreMock", this.adminSigner);
    this.ParamStoreV2 = await hardhat_1.default.ethers.getContractFactory("ParameterStoreMockV2", this.adminSigner);
    [this.otherUser] = await hardhat_1.ethers.getSigners();
});
it("is deployed", async function () {
    const store = await hardhat_1.default.upgrades.deployProxy(this.ParamStore, [adminAddress], { kind: "uups" });
    // Do some basic sanity checks
    (0, chai_1.expect)(await store.version()).to.equal("V1");
    (0, chai_1.expect)(await store.getSlippage()).to.equal(ethers_1.BigNumber.from(2));
    console.log("ParamStore1 adderess %s", await store.address);
    /// Note that unless states otherwise via connect(...) command, signer of actions is adminSigner
    // Test that admin can make changes
    await store.changeCurveGuardPercentage(91);
    (0, chai_1.expect)(await store.getCurveGuardPercentage()).to.equal(91);
    // // test that non admin cannot make changes!
    const changePromise = store.connect(this.otherUser).changeSlippage(2);
    await (0, chai_1.expect)(changePromise).to.be.revertedWith("Caller is not Governor");
    /// Run this section when you want to test (or actually deploy) an upgrade
    const storeV2 = await hardhat_1.default.upgrades.upgradeProxy(store, this.ParamStoreV2);
    // sanity check to check that contract is updated
    (0, chai_1.expect)(storeV2.address === store.address);
    (0, chai_1.expect)(await storeV2.version()).to.equal("V2");
    // Check that we can change state of new contract
    await store.changeCurveGuardPercentage(93);
    (0, chai_1.expect)(await store.getCurveGuardPercentage()).to.equal(93);
    console.log("ParamStore2 adderess %s", await storeV2.address);
    await (0, IntegrationTestContext_1.stopImpersonate)(adminAddress);
});
