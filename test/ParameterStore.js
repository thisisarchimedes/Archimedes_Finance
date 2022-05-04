const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ParameterStore test suit", async function () {
    let parameterStore;

    beforeEach(async () => {
        const psContract = await ethers.getContractFactory("ParameterStore");
        parameterStore = await psContract.deploy();
    });

    it("Should exist", async function () {
        await expect(parameterStore).to.not.be.undefined;
    });
});
