import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTestContext } from "./ContractTestContext";

describe("LeverageEngine test suit", async function () {
    let r;

    before(async () => {
        r = new ContractTestContext();
        await r.setup();
    });

    it("Should exist", async function () {
        await expect(r.leverageEngine).to.not.be.undefined;
    });

    describe("admin role", async function () {
        it("Should fail to init contract when called by different address from deployer", async function () {
            const leContract = await ethers.getContractFactory("LeverageEngine");
            const leverageEngine = await leContract.deploy(r.addr1.address);

            await expect(
                leverageEngine.init(
                    r.coordinator.address,
                    r.positionToken.address,
                    r.parameterStore.address,
                    r.leverageAllocator.address,
                ),
            ).to.be.revertedWith("Caller is not admin");
        });
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

    describe("destroyLeveragedPosition", async function () {
        it("Should fail if the caller is not the positionToken owner", async function () {
            await r.positionToken.mint(r.addr1.address, 1234);
            await expect(r.leverageEngine.destroyLeveragedPosition(1234)).to.be.revertedWith(
                "Caller address does not own this position token",
            );
        });
    });
});
