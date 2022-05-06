import { expect } from "chai";
import { ethers } from "hardhat";

describe("LeverageAllocator test suit", async function () {
    let leverageAllocator;

    beforeEach(async () => {
        const laContract = await ethers.getContractFactory("LeverageAllocator");
        leverageAllocator = await laContract.deploy();
    });

    it("Should exist", async function () {
        await expect(leverageAllocator).to.not.be.undefined;
    });
});
