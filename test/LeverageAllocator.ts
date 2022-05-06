import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("LeverageAllocator test suit", async function () {
    let r: ContractTestContext;

    before(async () => {
        r = await buildContractTestContext();
    });

    it("Should exist", async function () {
        await expect(leverageAllocator).to.not.be.undefined;
    });
});
