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
            ).to.be.revertedWith("onlyAdmin: Not admin");
        });
    });

    describe("initialization", async function () {
        it("createLeveragedPosition should revert when not intiailized", async function () {
            const leContract = await ethers.getContractFactory("LeverageEngine");
            const leverageEngine = await leContract.deploy(r.addr1.address);
            await expect(leverageEngine.createLeveragedPosition(1234, 1234)).to.be.revertedWith(
                "Not initialized",
            );
        });

        it("unwindLeveragedPosition should revert when not intiailized", async function () {
            const leContract = await ethers.getContractFactory("LeverageEngine");
            const leverageEngine = await leContract.deploy(r.addr1.address);
            await expect(leverageEngine.unwindLeveragedPosition(1234)).to.be.revertedWith(
                "Not initialized",
            );
        });
    });

    it("Should revert if cycles is greater than global max cycles", async function () {
        const maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const promise = r.leverageEngine.createLeveragedPosition(ethers.utils.parseUnits("1"), maxCycles.add(1));
        await expect(promise).to.be.revertedWith("Cycles greater than max allowed");
    });

    it("Should begin without a positionToken balance", async function () {
        const balance = await r.positionToken.balanceOf(r.owner.address);
        expect(balance).to.equal(0);
    });

    describe("After successful position creation", async function () {
        const principle = ethers.utils.parseUnits("1.0");
        const availableLvUSD = ethers.utils.parseUnits("100000");
        let maxCycles: BigNumber;
        let allowedLvUSDForPosition: BigNumber;
        let positionTokenId: BigNumber;

        let userInitialOUSD;
        before(async function () {
            await helperResetNetwork(defaultBlockNumber);
            r = await buildContractTestContext();
            maxCycles = await r.parameterStore.getMaxNumberOfCycles();
            const totalOUSD = await helperSwapETHWithOUSD(r.owner, ethers.utils.parseUnits("5"));
            await r.externalOUSD.approve(r.leverageEngine.address, totalOUSD);
            await r.leverageAllocator.setAddressToLvUSDAvailable(r.owner.address, availableLvUSD);
            await r.lvUSD.mint(r.coordinator.address, ethers.utils.parseUnits("5000"));
            allowedLvUSDForPosition = await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles);
            userInitialOUSD = await r.externalOUSD.balanceOf(r.owner.address);
            await r.leverageEngine.createLeveragedPosition(principle, maxCycles);
        });

        it("Should have use allocated lvUSD", async function () {
            const remainingLvUSD = await r.leverageAllocator.getAddressToLvUSDAvailable(r.owner.address);
            expect(remainingLvUSD).to.equal(availableLvUSD.sub(allowedLvUSDForPosition));
        });

        it("PositionToken balance of user should be 1", async () => {
            const balance = await r.positionToken.balanceOf(r.owner.address);
            expect(balance).to.equal(1);
        });

        it("Should return expected PositionToken id for first PositionToken minted", async () => {
            positionTokenId = await r.positionToken.tokenOfOwnerByIndex(r.owner.address, 0);
            expect(positionTokenId).to.equal(0);
        });

        it("Should have use allocated lvUSD", async function () {
            const remainingLvUSD = await r.leverageAllocator.getAddressToLvUSDAvailable(r.owner.address);
            expect(remainingLvUSD).to.equal(availableLvUSD.sub(allowedLvUSDForPosition));
        });

        it("Should have moved all OUSD funds out of the user's wallet", async function () {
            const balance = await r.externalOUSD.balanceOf(r.owner.address);
            expect(balance).to.equal(userInitialOUSD.sub(principle));
        });

        it("Should have minted a PositionToken to the users address", async function () {
            const balance = await r.positionToken.balanceOf(r.owner.address);
            expect(balance).to.equal(1);
            /* this is the first positionToken minted so its id should be 0 */
            expect(positionTokenId).to.equal(0);
        });

        it("Should fail to unwind if caller doesn't own positionToken", async function () {
            await r.positionToken.transferFrom(r.owner.address, r.addr1.address, positionTokenId);
            const unwindPromise = r.leverageEngine.unwindLeveragedPosition(positionTokenId);
            await expect(unwindPromise).to.be.revertedWith("Caller is not token owner");
        });

        it("Should fail to unwind if positionToken doesn't exist", async function () {
            await expect(r.leverageEngine.unwindLeveragedPosition(99999)).to.be.revertedWith("ERC721: owner query for nonexistent token");
        });

        describe("After successful position unwind", async () => {
            before(async () => {
                await r.positionToken.connect(r.addr1).transferFrom(r.addr1.address, r.owner.address, positionTokenId);
                await r.leverageEngine.unwindLeveragedPosition(positionTokenId);
            });

            it("Should destroy the positionToken", async () => {
                const exists = await r.positionToken.exists(positionTokenId);
                expect(exists).to.equal(false);
            });

            it("Should move funds back to the position owner", async () => {
                const balance: BigNumber = await r.externalOUSD.balanceOf(r.owner.address);
                expect(balance.gt(0)).to.be.true;
            });
        });
    });
});
