const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LeverageEngine test suit", async function () {
    let leverageEngine;

    beforeEach(async () => {
        const leContract = await ethers.getContractFactory("LeverageEngine");
        leverageEngine = await leContract.deploy();
    });

    it("Should exist", async function () {
        console.log(leverageEngine);
    });
});
