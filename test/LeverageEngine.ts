import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { defaultBlockNumber, helperResetNetwork, helperSwapETHWithOUSD } from "./MainnetHelper";

describe("LeverageEngine test suit", async function () {
    let r: ContractTestContext;

    before(async () => {
        await helperResetNetwork(defaultBlockNumber);
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
                    r.externalOUSD.address,
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

    describe("createLeveragedPosition", async function () {
        it("Should revert if cycles is greater than global max cycles", async function () {
            const maxCycles = await r.parameterStore.getMaxNumberOfCycles();
            const promise = r.leverageEngine.createLeveragedPosition(ethers.utils.parseEther("1"), maxCycles.add(1));
            await expect(promise).to.be.revertedWith("Number of cycles must be lower then allowed max");
        });

        it("Should begin without a positionToken balance", async function () {
            const balance = await r.positionToken.balanceOf(r.owner.address);
            expect(balance).to.equal(0);
        });

        describe("Successful position creation", async function () {
            const principle = ethers.utils.parseEther("1");
            const availableLvUSD = ethers.utils.parseEther("10");
            let maxCycles: BigNumber;
            let allowedLvUSDForPosition: BigNumber;

            before(async function () {
                maxCycles = await r.parameterStore.getMaxNumberOfCycles();
                await helperSwapETHWithOUSD(r.owner, principle);
                await r.externalOUSD.approve(r.coordinator.address, ethers.utils.parseEther("10"));
                await r.leverageAllocator.setAddressToLvUSDAvailable(r.owner.address, availableLvUSD);
                await r.lvUSD.mint(r.coordinator.address, ethers.utils.parseEther("100"));
                allowedLvUSDForPosition = await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles);
                await r.leverageEngine.createLeveragedPosition(principle, maxCycles);
            });

            it("Should use allocated lvUSD", async function () {
                const remainingLvUSD = await r.leverageAllocator.getAddressToLvUSDAvailable(r.owner.address);
                expect(remainingLvUSD).to.equal(availableLvUSD.sub(allowedLvUSDForPosition));
            });

            it("Should mint a PositionToken to the users address", async function () {
                const [balance, positionTokenId] = await Promise.all([
                    r.positionToken.balanceOf(r.owner.address),
                    r.positionToken.tokenOfOwnerByIndex(r.owner.address, 0),
                ]);
                expect(balance).to.equal(1);
                /* this is the first positionToken minted so its id should be 0 */
                expect(positionTokenId).to.equal(0);
            });

            it("Should transfer OUSD equal to principle to the Coordinator for processing", async function () {

            });
        });
    });
});
