import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("LeverageAllocator test suit", async function () {
    let r: ContractTestContext;

    before(async () => {
        r = await buildContractTestContext();
    });

    it("Should exist", async function () {
        await expect(r.leverageAllocator).to.not.be.undefined;
    });

    it("Should not allow non admin to set available lvUSD allocation", async function () {
        const laContract = await ethers.getContractFactory("LeverageAllocator");
        const leverageAllocator = await laContract.deploy(r.addr1.address);

        await expect(
            leverageAllocator.setAddressToLvUSDAvailable(r.addr2.address, 1234),
        ).to.be.revertedWith("onlyAdmin: Caller is not admin");
    });

    it("Should allow admin to set available lvUSD allocation", async function () {
        // r.leverageAllocator.getAddressToLvUSDAvailable();
        // r.leverageAllocator.setAddressToLvUSDAvailable();
    });
});
