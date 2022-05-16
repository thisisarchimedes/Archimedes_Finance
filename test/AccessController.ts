import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { AccessController, PositionToken } from "../types/contracts";
import { signers } from "./ContractTestContext";

describe("AccessController test suit", function () {
    let accessControllerAsAdmin: AccessController;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;

    before(async () => {
        [owner, addr1] = await signers;
        const acFactory = await ethers.getContractFactory("AccessController");
        accessControllerAsAdmin = await acFactory.deploy(owner.address) as AccessController;
    });

    // it("Should not allow non admin to init", async function () {
    //     const initPromise = accessControllerAsAdmin.connect(addr1).init();
    //     await expect(initPromise).to.be.revertedWith("onlyAdmin: Caller is not admin");
    // });
});
