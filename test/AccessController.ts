import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { AccessControllerMock } from "../types/contracts/Mocks";
import { signers } from "./ContractTestContext";

describe("AccessController test suit", function () {
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let addr3: SignerWithAddress;
    let accessControllerMock: AccessControllerMock;
    const initArg = 1234;

    before(async () => {
        [owner, addr1, addr2, addr3] = await signers;
        /* AccessController is abstract so we need to use a contract that inherits it to test with: */
        const factory = await ethers.getContractFactory("AccessControllerMock");
        accessControllerMock = await factory.deploy(owner.address) as AccessControllerMock;
    });

    it("Should not allow non admin to init", async function () {
        const initAsNonAdminPromise = accessControllerMock.connect(addr1).init(1234);
        /* children with init need to add initializer modifier internally which will trigger this error */
        await expect(initAsNonAdminPromise).to.be.revertedWith("Caller is not admin");
    });

    it("Should revert function with expectInitialized modifier if not initialized", async function () {
        const initAsNonAdminPromise = accessControllerMock.mockExpectInitialized();
        /* children with init need to add initializer modifier internally which will trigger this error */
        await expect(initAsNonAdminPromise).to.be.revertedWith("Contract is not initialized");
    });

    it("Should allow admin to init", async function () {
        await accessControllerMock.init(initArg);
        const initialized = await accessControllerMock.getInitialized();
        await expect(initialized).to.be.true;
    });

    it("Should execute code in child contract init function as part of AccessController.initializer", async function () {
        /* someArg is set in mock child's init function: */
        const someArg = await accessControllerMock.someArg();
        expect(someArg).to.equal(initArg);
    });

    it("Should not allow admin to init twice", async function () {
        const initPromise = accessControllerMock.init(1234);
        await expect(initPromise).to.be.revertedWith("initializer: Already initialized");
    });

    it("Should revert if roles not set while getting role address", async function () {
        const getAddressAdminPromise = accessControllerMock.getAddressAdmin();
        const getAddressExecutivePromise = accessControllerMock.getAddressExecutive();
        const getAddressGovernorPromise = accessControllerMock.getAddressGovernor();
        const getAddressGuardianPromise = accessControllerMock.getAddressGuardian();
        /* children with init need to add initializer modifier internally which will trigger this error */
        await expect(getAddressAdminPromise).to.be.revertedWith("Roles have not been set up");
        await expect(getAddressExecutivePromise).to.be.revertedWith("Roles have not been set up");
        await expect(getAddressGovernorPromise).to.be.revertedWith("Roles have not been set up");
        await expect(getAddressGuardianPromise).to.be.revertedWith("Roles have not been set up");
    });

    it("Should not allow non admin to call setRoles", async function () {
        const setRolesPromise = accessControllerMock.connect(addr1).setRoles(owner.address, addr1.address, addr2.address);
        await expect(setRolesPromise).to.be.revertedWith("Caller is not admin");
    });

    it("Should allow admin to call setRoles", async function () {
        const executive = addr3.address;
        const governor = addr1.address;
        const guardian = addr2.address;
        await accessControllerMock.setRoles(executive, governor, guardian);
        const executiveSet = await accessControllerMock.getAddressExecutive();
        const governorSet = await accessControllerMock.getAddressGovernor();
        const guardianSet = await accessControllerMock.getAddressGuardian();
        await expect(executive).to.equal(executiveSet);
        await expect(governor).to.equal(governorSet);
        await expect(guardian).to.equal(guardianSet);
    });

    it("Should revert if non executive calls onlyExecutive function", async function () {
        const mockOnlyExecutivePromise = accessControllerMock.mockOnlyExecutive();
        await expect(mockOnlyExecutivePromise).to.be.revertedWith("Caller is not executive");
    });

    it("Should revert if non governor calls onlyGovernor function", async function () {
        const mockOnlyGovernorPromise = accessControllerMock.mockOnlyGovernor();
        await expect(mockOnlyGovernorPromise).to.be.revertedWith("Caller is not governor");
    });

    it("Should revert if non guardian calls onlyGuardian function", async function () {
        const mockOnlyGovernorPromise = accessControllerMock.mockOnlyGuardian();
        await expect(mockOnlyGovernorPromise).to.be.revertedWith("Caller is not guardian");
    });
});
