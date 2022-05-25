import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("LeverageAllocator test suit", async function () {
    let r: ContractTestContext;

    describe("Access with proper roles", () => {
        before(async () => {
            r = await buildContractTestContext();
        });

        it("Should be built properly by ContractTestContext", function () {
            expect(r.leverageAllocator).to.not.be.undefined;
        });

        it("Should allow admin to set available lvUSD allocation", async function () {
            r.leverageAllocator.setAddressToLvUSDAvailable(r.addr1.address, ethers.utils.parseUnits("1"));
            r.leverageAllocator.setAddressToLvUSDAvailable(r.addr2.address, ethers.utils.parseUnits("2"));
            const availableLvUSDAddr1 = await r.leverageAllocator.getAddressToLvUSDAvailable(r.addr1.address);
            expect(availableLvUSDAddr1).to.equal(ethers.utils.parseUnits("1"));
            const availableLvUSDAddr2 = await r.leverageAllocator.getAddressToLvUSDAvailable(r.addr2.address);
            expect(availableLvUSDAddr2).to.equal(ethers.utils.parseUnits("2"));
        });

        it("Should revert if attempting to use more than allocated amount", async function () {
            await expect(
                r.leverageAllocator.useAvailableLvUSD(r.addr1.address, ethers.utils.parseUnits("2")),
            ).to.be.revertedWith("Insufficient lvUSD allocation");
        });

        it("Should successfully use allocated amount without affecting other address amounts", async function () {
            const expectedRemainingAmount = ethers.utils.parseUnits("0");
            const transaction = await r.leverageAllocator.useAvailableLvUSD(r.addr1.address, ethers.utils.parseUnits("1"));
            await expect(transaction.value).to.equal(expectedRemainingAmount);
            const remainingAmount = await r.leverageAllocator.getAddressToLvUSDAvailable(r.addr1.address);
            expect(remainingAmount).to.equal(expectedRemainingAmount);
            const availableLvUSDAddr2 = await r.leverageAllocator.getAddressToLvUSDAvailable(r.addr2.address);
            expect(availableLvUSDAddr2).to.equal(ethers.utils.parseUnits("2"));
        });
    });

    describe("Access without proper role", () => {
        it("Should not allow non admin to set available lvUSD allocation", async function () {
            const withAddr1Admin = await buildContractTestContext({
                LeverageAllocator: { admin: r.addr1.address },
            });

            await expect(
                withAddr1Admin.leverageAllocator.setAddressToLvUSDAvailable(r.addr2.address, 1234),
            ).to.be.revertedWith("Caller is not admin");
        });
    });
});
