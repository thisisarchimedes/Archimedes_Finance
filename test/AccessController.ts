import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { AccessController, LeverageEngine } from "../types/contracts";
import { buildContractTestContext, ContractTestContext, signers } from "./ContractTestContext";

describe("AccessController test suit", function () {
    describe("AccessController as non admin", async function () {
        /* AccessController is abstract so we need to use a contract that inherits it to test with: */
        let addr1;
        let contextAsNonAdminPromise;

        before(async () => {
            [, addr1] = await signers;
            contextAsNonAdminPromise = buildContractTestContext({
                LeverageEngine: { admin: addr1.address },
            });
        });

        it("Should not allow non admin to init", async function () {
            /* children with init need to add initializer modifier internally which will trigger this error */
            await expect(contextAsNonAdminPromise).to.be.revertedWith("onlyAdmin: Caller is not admin");
        });
    });

    describe("AccessController as admin", async function () {
        let contextAsAdmin: ContractTestContext;
        /* AccessController is abstract so we need to use a contract that inherits it to test with: */
        let accessControllerChildAsAdmin: LeverageEngine;

        before(async () => {
            const [owner, addr1] = await signers;
            contextAsAdmin = await buildContractTestContext();
            accessControllerChildAsAdmin = contextAsAdmin.leverageEngine;
        });

        it("Should should be built properly by", async function () {
            // const initPromise = accessControllerAsAdmin.connect(addr1).init();
            await expect(accessControllerChildAsAdmin).to.not.be.undefined;
        });
    });
});
