"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ContractTestContext_1 = require("./ContractTestContext");
const MainnetHelper_1 = require("./MainnetHelper");
describe("LeverageEngine test suit", async function () {
    let r;
    const principleNaturalString = "2";
    const principle = hardhat_1.ethers.utils.parseUnits(principleNaturalString);
    const archTokenToBurn = hardhat_1.ethers.utils.parseUnits("100.0");
    let initialArchTokenBalance;
    let maxCycles;
    let positionTokenId;
    let userInitialOUSD;
    async function prepForPositionCreation(lvUSDAmountToMint = hardhat_1.ethers.utils.parseUnits("5000")) {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const totalOUSD = await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.owner, hardhat_1.ethers.utils.parseUnits("5"));
        await r.externalOUSD.approve(r.leverageEngine.address, totalOUSD);
        await r.lvUSD.setMintDestination(r.coordinator.address);
        await r.lvUSD.mint(lvUSDAmountToMint);
        await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(r, lvUSDAmountToMint);
        await r.parameterStore.changeMinPositionCollateral(principle);
        // give owner ArchToken from minted tokens
        await r.archToken.connect(r.treasurySigner).transfer(r.owner.address, archTokenToBurn);
        // give LevEng approval to burn owner's arch tokens
        initialArchTokenBalance = await r.archToken.balanceOf(r.owner.address);
        await r.archToken.approve(r.leverageEngine.address, archTokenToBurn);
        userInitialOUSD = await r.externalOUSD.balanceOf(r.owner.address);
        // LevEngine is the exec of position creation so need to be set
        await (0, ContractTestContext_1.setRolesForEndToEnd)(r);
    }
    before(async () => {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
    });
    it("Should be built properly by ContractTestContext", async function () {
        (0, chai_1.expect)(r.leverageEngine).to.not.be.undefined;
    });
    it("Should revert if cycles is greater than global max cycles", async function () {
        const maxCycles = await r.parameterStore.getMaxNumberOfCycles();
        const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles.add(1), hardhat_1.ethers.utils.parseUnits("10"));
        await (0, chai_1.expect)(promise).to.be.revertedWith("Invalid number of cycles");
    });
    it("Should begin without a positionToken balance", async function () {
        const balance = await r.positionToken.balanceOf(r.owner.address);
        (0, chai_1.expect)(balance).to.equal(0);
    });
    describe("unsuccessful position creation", async function () {
        before(async function () {
            await prepForPositionCreation(hardhat_1.ethers.utils.parseUnits("0"));
        });
        it("Should fail because not enough lvUSD available to use", async function () {
            const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
            await (0, chai_1.expect)(promise).to.be.revertedWith("Not enough available leverage");
        });
        it("Should fail because not enough arch tokens burned", async function () {
            await r.lvUSD.mint(hardhat_1.ethers.utils.parseUnits("5000"));
            const promise = r.leverageEngine.createLeveragedPosition(principle, maxCycles, hardhat_1.ethers.utils.parseUnits("0.0001"));
            await (0, chai_1.expect)(promise).to.be.revertedWith("Not enough Arch for Pos");
            // Now check that no arch was burned on revert
            const archBalance = await r.archToken.balanceOf(r.owner.address);
            (0, chai_1.expect)(archBalance).to.equal(initialArchTokenBalance);
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
            await (0, chai_1.expect)(promise)
                .to.emit(r.leverageEngine, "PositionCreated")
                .withArgs(r.owner.address, 0, principle, await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles), anyValue, anyValue);
        });
        it("Should emit position unwind event", async function () {
            const promise = r.leverageEngine.unwindLeveragedPosition(0);
            await (0, chai_1.expect)(promise).to.emit(r.leverageEngine, "PositionUnwind");
        });
    });
    describe("After successful position creation", async function () {
        before(async function () {
            await prepForPositionCreation();
            await r.leverageEngine.createLeveragedPosition(principle, maxCycles, archTokenToBurn);
        });
        it("PositionToken balance of user should be equal to 1 (balance is of number of NFTs)", async () => {
            const balance = await r.positionToken.balanceOf(r.owner.address);
            (0, chai_1.expect)(balance).to.equal(1);
        });
        it("Should return expected PositionToken id for first PositionToken minted", async () => {
            positionTokenId = await r.positionToken.tokenOfOwnerByIndex(r.owner.address, 0);
            (0, chai_1.expect)(positionTokenId).to.equal(0);
        });
        it("Should have moved all OUSD funds out of the user's wallet", async function () {
            const balance = await r.externalOUSD.balanceOf(r.owner.address);
            (0, chai_1.expect)(balance).to.equal(userInitialOUSD.sub(principle));
        });
        it("Should have minted a PositionToken to the users address", async function () {
            const balance = await r.positionToken.balanceOf(r.owner.address);
            (0, chai_1.expect)(balance).to.equal(1);
            /* this is the first positionToken minted so its id should be 0 */
            (0, chai_1.expect)(positionTokenId).to.equal(0);
        });
        it("Should have burned ArchTokens with position creation", async function () {
            const archBalance = await r.archToken.balanceOf(r.owner.address);
            const positionLevTaken = await r.parameterStore.getAllowedLeverageForPosition(principle, maxCycles);
            const archUsed = await r.parameterStore.calculateArchNeededForLeverage(positionLevTaken);
            /// Numbers here are 18 decimal, so 10000 closeTo means +- 10k wei
            (0, chai_1.expect)(archBalance).to.closeTo(initialArchTokenBalance.sub(archUsed), 10000);
        });
        it("Should fail to unwind if caller doesn't own positionToken", async function () {
            await r.positionToken.transferFrom(r.owner.address, r.addr1.address, positionTokenId);
            const unwindPromise = r.leverageEngine.unwindLeveragedPosition(positionTokenId);
            await (0, chai_1.expect)(unwindPromise).to.be.revertedWith("Caller is not token owner");
        });
        it("Should fail to unwind if positionToken doesn't exist", async function () {
            await (0, chai_1.expect)(r.leverageEngine.unwindLeveragedPosition(99999)).to.be.revertedWith("ERC721: invalid token ID");
        });
        describe("After successful position unwind", async () => {
            before(async () => {
                await r.positionToken.connect(r.addr1).transferFrom(r.addr1.address, r.owner.address, positionTokenId);
                await r.leverageEngine.unwindLeveragedPosition(positionTokenId);
            });
            it("Should destroy the positionToken", async () => {
                const exists = await r.positionToken.exists(positionTokenId);
                (0, chai_1.expect)(exists).to.equal(false);
            });
            it("Should move funds back to the position owner", async () => {
                const balance = await r.externalOUSD.balanceOf(r.owner.address);
                (0, chai_1.expect)(balance.gt(0)).to.be.true;
            });
        });
    });
});
