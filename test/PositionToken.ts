import { expect } from "chai";
import { ethers } from "hardhat";

describe("PositionToken test suit", async function () {
    let positionToken;

    beforeEach(async () => {
        const ptContract = await ethers.getContractFactory("PositionToken");
        positionToken = await ptContract.deploy();
    });

    it("Should exist", async function () {
        expect(positionToken).to.not.be.undefined;
    });
});
