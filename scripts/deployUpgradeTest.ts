import hre, { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";
import { stopImpersonate, impersonateAccount, fundAccount } from "../integrationTests/IntegrationTestContext";

const About4700ETH = "0x1000000000000000000";
const adminAddress = "0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F";

before("get factories", async function () {
    this.adminSigner = await impersonateAccount(adminAddress);
    await fundAccount(adminAddress, About4700ETH);
    this.ParamStore = await hre.ethers.getContractFactory("ParameterStoreMock", this.adminSigner);
    this.ParamStoreV2 = await hre.ethers.getContractFactory("ParameterStoreMockV2", this.adminSigner);
    [this.otherUser] = await ethers.getSigners();
});

it("is deployed", async function () {
    const store = await hre.upgrades.deployProxy(this.ParamStore, [adminAddress], { kind: "uups" });

    // Do some basic sanity checks
    expect(await store.version()).to.equal("V1");
    expect(await store.getSlippage()).to.equal(BigNumber.from(2));

    console.log("ParamStore1 adderess %s", await store.address);

    /// Note that unless states otherwise via connect(...) command, signer of actions is adminSigner

    // Test that admin can make changes
    await store.changeCurveGuardPercentage(91);
    expect(await store.getCurveGuardPercentage()).to.equal(91);

    // // test that non admin cannot make changes!
    const changePromise = store.connect(this.otherUser).changeSlippage(2);
    await expect(changePromise).to.be.revertedWith("Caller is not Governor");

    /// Run this section when you want to test (or actually deploy) an upgrade

    const storeV2 = await hre.upgrades.upgradeProxy(store, this.ParamStoreV2);

    // sanity check to check that contract is updated
    expect(await storeV2.version()).to.equal("V2");
    console.log("ParamStore2 adderess %s", await storeV2.address);

    await stopImpersonate(adminAddress);
});
