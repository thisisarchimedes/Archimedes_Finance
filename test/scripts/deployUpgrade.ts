import hre, { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";

before("get factories", async function () {
    this.ParamStore = await hre.ethers.getContractFactory("ParameterStore");
    this.ParamStoreV2 = await hre.ethers.getContractFactory("ParameterStoreV2");
});

it("is deployed", async function () {
    const store = await hre.upgrades.deployProxy(this.ParamStore, ["0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F"], { kind: "uups" });
    expect(await store.getSlippage()).to.equal(BigNumber.from(2));
    
    console.log("ParamStore1 adderess %s", await store.address);

    // const storeV2 = await hre.upgrades.upgradeProxy(store, this.ParamStoreV2);
    // expect(await storeV2.version()).to.equal("V2");
    // console.log("ParamStore2 adderess %s", await storeV2.address);
});
