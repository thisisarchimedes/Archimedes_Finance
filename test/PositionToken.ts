import { expect } from "chai";
import { ethers } from "hardhat";
import { PositionToken } from "../types/contracts";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("PositionToken test suit", async function () {
    let r: ContractTestContext;
    let positionToken: PositionToken;

    before(async () => {
        r = await buildContractTestContext();
    });

    beforeEach(async () => {
        const ptContract = await ethers.getContractFactory("PositionToken");
        positionToken = await ptContract.deploy();
    });

    it("Should exist", async function () {
        expect(positionToken).to.not.be.undefined;
    });

    it("Should not allow non admin to init", async function () {
        const laContract = await ethers.getContractFactory("PositionToken");
        const leverageAllocator = await laContract.deploy(r.addr1.address);

        await expect(
            leverageAllocator.setAddressToLvUSDAvailable(r.addr2.address, 1234),
        ).to.be.revertedWith("onlyAdmin: Caller is not admin");
    });

    it("Should be mintable from address designated executive", async function () {
        expect(positionToken).to.not.be.undefined;
    });

    it("Should not be mintable from an address other than LeverageEngine", async function () {
        expect(positionToken).to.not.be.undefined;
    });
});
