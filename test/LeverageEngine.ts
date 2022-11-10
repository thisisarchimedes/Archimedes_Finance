import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext, setRolesForEndToEnd } from "./ContractTestContext";
import { helperSwapETHWithOUSD } from "./MainnetHelper";

describe("LeverageEngine test suit", async function () {
    let r: ContractTestContext;
    const principleNaturalString = "2";

    const principle = ethers.utils.parseUnits(principleNaturalString);
    const archTokenToBurn = ethers.utils.parseUnits("100.0");
    let initialArchTokenBalance;
    let maxCycles: BigNumber;
    let positionTokenId: BigNumber;
    let userInitialOUSD;

    async function prepForPositionCreation (lvUSDAmountToMint: BigNumber = ethers.utils.parseUnits("5000")) {
        r = await buildContractTestContext();
        maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const totalOUSD = await helperSwapETHWithOUSD(r.owner, ethers.utils.parseUnits("5"));
        await r.externalOUSD.approve(r.leverageEngine.address, totalOUSD);
        await r.lvUSD.setMintDestination(r.coordinator.address);
        await r.lvUSD.mint(lvUSDAmountToMint);
        await r.parameterStore.changeMinPositionCollateral(principle);
        // give owner ArchToken from minted tokens
        await r.archToken.connect(r.treasurySigner).transfer(r.owner.address, archTokenToBurn);
        // give LevEng approval to burn owner's arch tokens
        initialArchTokenBalance = await r.archToken.balanceOf(r.owner.address);
        await r.archToken.approve(r.leverageEngine.address, archTokenToBurn);
        userInitialOUSD = await r.externalOUSD.balanceOf(r.owner.address);
        // LevEngine is the exec of position creation so need to be set
        await setRolesForEndToEnd(r);
    }

    before(async () => {
        r = await buildContractTestContext();
    });

    it("Should be built properly by ContractTestContext", async function () {
        expect(r.leverageEngine).to.not.be.undefined;
    });

    it("Should revert if cycles is greater than global max cycles", async function () {
        const maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles.add(1), ethers.utils.parseUnits("10"));
        await expect(promise).to.be.revertedWith("Invalid number of cycles");
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
            await r.lvUSD.mint(ethers.utils.parseUnits("5000"));
            const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles, ethers.utils.parseUnits("0.0001"));
            await expect(promise).to.be.revertedWith("Not enough Arch for Pos");
            // Now check that no arch was burned on revert
            const archBalance = await r.archToken.balanceOf(r.owner.address);
            expect(archBalance).to.equal(initialArchTokenBalance);
        });
    });

    describe("Emitting events", async function () {
        before(async function () {
            await prepForPositionCreation();
        });
        it("Should emit position creation event", async function () {
            const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
            await expect(promise)
                .to.emit(r.leverageEngine, "PositionCreated")
                .withArgs(
                    r.owner.address,
                    0,
                    principle,
                    await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles),
                    anyValue,
                    anyValue,
                );
        });

        it("Should emit position unwind event", async function () {
            const promise = r.leverageEngine.unwindLeveragedPosition(0);
            await expect(promise).to.emit(r.leverageEngine, "PositionUnwind");
        });
    });
    describe("After successful position creation", async function () {
        before(async function () {
            await prepForPositionCreation();
            await r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
        });

        it("PositionToken balance of user should be equal to 1 (balance is of number of NFTs)", async () => {
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
            const positionLevTaken = await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles);
            const archUsed = await r.parameterStore.calculateArchNeededForLeverage(positionLevTaken);
            /// Numbers here are 18 decimal, so 10000 closeTo means +- 10k wei
            expect(archBalance).to.closeTo(initialArchTokenBalance.sub(archUsed), 10000);
        });

        it("Should fail to unwind if caller doesn't own positionToken", async function () {
            await r.positionToken.transferFrom(r.owner.address, r.addr1.address, positionTokenId);
            const unwindPromise = r.leverageEngine.unwindLeveragedPosition(positionTokenId);
            await expect(unwindPromise).to.be.revertedWith("Caller is not token owner");
        });

        it("Should fail to unwind if positionToken doesn't exist", async function () {
            await expect(r.leverageEngine.unwindLeveragedPosition(99999)).to.be.revertedWith("ERC721: invalid token ID");
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
