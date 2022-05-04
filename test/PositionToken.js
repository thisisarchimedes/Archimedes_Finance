const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PositionToken test suit", async function () {
    let positionToken;

    beforeEach(async () => {
        const ptContract = await ethers.getContractFactory("PositionToken");
        positionToken = await ptContract.deploy();
    });

    it("Should exist", async function () {
        await expect(positionToken).to.not.be.undefined;
    });
});
