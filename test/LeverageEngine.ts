import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("LeverageEngine test suit", async function () {
    let r: ContractTestContext;

    before(async () => {
        r = await buildContractTestContext();
    });

    it("Should be built properly by ContractTestContext", async function () {
        expect(r.leverageEngine).to.not.be.undefined;
    });

    describe("initialization", async function () {
        it("createLeveragedPosition should revert when not intiailized", async function () {
            const leContract = await ethers.getContractFactory("LeverageEngine");
            const leverageEngine = await leContract.deploy(r.addr1.address);
            await expect(leverageEngine.createLeveragedPosition(1234, 1234)).to.be.revertedWith(
                "expectInitialized: contract is not initialized",
            );
        });

        it("destroyLeveragedPosition should revert when not intiailized", async function () {
            const leContract = await ethers.getContractFactory("LeverageEngine");
            const leverageEngine = await leContract.deploy(r.addr1.address);
            await expect(leverageEngine.destroyLeveragedPosition(1234)).to.be.revertedWith(
                "expectInitialized: contract is not initialized",
            );
        });
    });
});
