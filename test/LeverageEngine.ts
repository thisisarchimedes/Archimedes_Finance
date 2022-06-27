import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { helperSwapETHWithOUSD } from "./MainnetHelper";

describe("LeverageEngine test suit", async function () {
    let r: ContractTestContext;
    const principle = ethers.utils.parseUnits("1.0");
    const archTokenToBurn = ethers.utils.parseUnits("100.0");
    let initialArchTokenBalance;
    let maxCycles: BigNumber;
    let positionTokenId: BigNumber;
    let userInitialOUSD;

    async function prepForPositionCreation (lvUSDAmountToMint:BigNumber = ethers.utils.parseUnits("5000")) {
        r = await buildContractTestContext();
        maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const totalOUSD = await helperSwapETHWithOUSD(r.owner, ethers.utils.parseUnits("5"));
        await r.externalOUSD.approve(r.leverageEngine.address, totalOUSD);
        await r.lvUSD.mint(r.coordinator.address, lvUSDAmountToMint);
        // give LevEng approval to burn owner's arch tokens
        initialArchTokenBalance = await r.archToken.balanceOf(r.owner.address);
        await r.archToken.approve(r.leverageEngine.address, archTokenToBurn);
        userInitialOUSD = await r.externalOUSD.balanceOf(r.owner.address);
    }
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
            await expect(leverageEngine.createLeveragedPosition(1234, 1234, 1234)).to.be.revertedWith(
                "Contract is not initialized",
            );
        });

        it("unwindLeveragedPosition should revert when not intiailized", async function () {
            const leContract = await ethers.getContractFactory("LeverageEngine");
            const leverageEngine = await leContract.deploy(r.addr1.address);
            await expect(leverageEngine.unwindLeveragedPosition(1234)).to.be.revertedWith(
                "Contract is not initialized",
            );
        });
    });

    it("Should revert if cycles is greater than global max cycles", async function () {
        const maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const promise = r.leverageEngine.createLeveragedPosition(
            ethers.utils.parseUnits("1"), maxCycles.add(1), ethers.utils.parseUnits("1"));
        await expect(promise).to.be.revertedWith("Cycles greater than max allowed");
    });

    it("Should begin without a positionToken balance", async function () {
        const balance = await r.positionToken.balanceOf(r.owner.address);
        expect(balance).to.equal(0);
    });

    describe("unsuccessful position creation", async function () {
        before(async function () {
            await prepForPositionCreation(ethers.utils.parseUnits("0"));
        });
        it("Should fail because not enough lvUSD available to use", async function () {
            const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
            await expect(promise).to.be.revertedWith("Not enough available lvUSD");
        });
        it("Should fail because not enough arch tokens burned", async function () {
            await r.lvUSD.mint(r.coordinator.address, ethers.utils.parseUnits("5000"));
            const promise = r.leverageEngine.createLeveragedPosition(
                principle, maxCycles, ethers.utils.parseUnits("1"));
            await expect(promise).to.be.revertedWith("Not enough Arch provided");
            // Now check that no arch was burned on revert
            const archBalance = await r.archToken.balanceOf(r.owner.address);
            expect(archBalance).to.equal(initialArchTokenBalance);
        });
    });

    describe("Emiting events", async function () {
        before(async function () {
            await prepForPositionCreation();
        });
        it("Should emit position creation event", async function () {
            const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
            await expect(promise).to.emit(r.leverageEngine, "PositionCreated").withArgs(
                r.owner.address, 0, principle, await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles), archTokenToBurn,
            );
        });

        it("Should emit position unwind event", async function () {
            const promise = r.leverageEngine.unwindLeveragedPosition(0);
            await expect(promise).to.emit(r.leverageEngine, "PositionUnwind").withArgs(
                // there really is no reasonable way to get the total windfall of position without actually unwinding
                // Using fixed value instead. If needed, we can duplicate creation/unwind
                // and save the value, reset network and do it again but that's a bit much for now
                r.owner.address, 0, "648327176046477764",
            );
        });
    });
    describe("After successful position creation", async function () {
        before(async function () {
            await prepForPositionCreation();
            await r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
        });

        it("PositionToken balance of user should be 1", async () => {
            const balance = await r.positionToken.balanceOf(r.owner.address);
            expect(balance).to.equal(1);
        });

        it("Should return expected PositionToken id for first PositionToken minted", async () => {
            positionTokenId = await r.positionToken.tokenOfOwnerByIndex(r.owner.address, 0);
            expect(positionTokenId).to.equal(0);
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

        it("Should have burned ArchTokens with position creation", async function () {
            const archBalance = await r.archToken.balanceOf(r.owner.address);
            expect(archBalance).to.equal(initialArchTokenBalance.sub(archTokenToBurn));
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
