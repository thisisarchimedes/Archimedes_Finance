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
            ).to.be.revertedWith("onlyAdmin: Caller is not admin");
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
            const transaction = await r.leverageEngine.createLeveragedPosition(1000, 3);
            // await expect(r.leverageEngine.destroyLeveragedPosition(transaction.value)).to.be.revertedWith(
            //     "Caller address does not own this position token",
            // );
        });
    });
});
