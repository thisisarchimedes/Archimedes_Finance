"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("ethers/lib/utils");
const chai_1 = require("chai");
const ContractTestContext_1 = require("./ContractTestContext");
const MainnetHelper_1 = require("./MainnetHelper");
const CurveHelper_1 = require("./CurveHelper");
const ethers_1 = require("ethers");
const logger_1 = require("../logger");
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
let r;
let owner;
let user;
let userOther;
let pretendOUSDRebaseSigner;
let lvUSD3CRVPoolInstance;
const userOUSDPrinciple = 100 + Math.random();
const fundsInPoolBase = getFloatFromBigNum(CurveHelper_1.fundedPoolAmount);
const fundInPoolAddOnForTest = 600;
const initialFundsInPool = fundInPoolAddOnForTest + fundsInPoolBase;
const initialCoordinatorLvUSDBalance = 10000;
// const initialUserLevAllocation = 10000;
const numberOfCycles = 2;
/// Add either 0 or 1 to the last bit of 18Dec number. Used to test rounding errors
const userOUSDPrincipleIn18Decimal = parseUnitsNum(userOUSDPrinciple).add(ethers_1.BigNumber.from(1 * Math.round(Math.random())));
let positionId;
let adminInitial3CRVBalance;
let ownerLvUSDBalanceBeforeFunding;
async function approveAndGetLeverageAsUser(_principleOUSD, _numberOfCycles, _archTokenAmount, _r, _user) {
    // logger(
    //     "Will deposit %s OUSD principle that cost %s ArchToken for %s cycles",
    //     getFloatFromBigNum(_principleOUSD),
    //     getFloatFromBigNum(_archTokenAmount),
    //     _numberOfCycles,
    // );
    // these two approvals will happen on the UI side when a customer actually creates a position via UI
    await _r.archToken.connect(_user).approve(_r.leverageEngine.address, _archTokenAmount);
    await _r.externalOUSD.connect(_user).approve(_r.leverageEngine.address, _principleOUSD);
    await _r.leverageEngine.connect(_user).createLeveragedPosition(_principleOUSD, _numberOfCycles, _archTokenAmount);
}
function parseUnitsNum(num) {
    return (0, utils_1.parseUnits)(num.toString());
}
function getFloatFromBigNum(bigNumValue) {
    return parseFloat((0, utils_1.formatUnits)(bigNumValue));
}
async function printPoolState(poolInstance) {
    (0, logger_1.logger)("Pool has %s coin0/lvUSD and %s coin1/3CRV", getFloatFromBigNum(await poolInstance.balances(0)), getFloatFromBigNum(await poolInstance.balances(1)));
}
async function printPositionState(_r, _positionId, overviewMessage = "Printing Position State") {
    (0, logger_1.logger)(overviewMessage);
    const principle = getFloatFromBigNum(await _r.cdp.getOUSDPrinciple(_positionId));
    const ousdEarned = getFloatFromBigNum(await _r.cdp.getOUSDInterestEarned(_positionId));
    const ousdTotal = getFloatFromBigNum(await _r.cdp.getOUSDTotalWithoutInterest(_positionId));
    const lvUSDBorrowed = getFloatFromBigNum(await _r.cdp.getLvUSDBorrowed(_positionId));
    const shares = getFloatFromBigNum(await _r.cdp.getShares(_positionId));
    // logger(
    //     "Stats for NFT %s: principle %s, ousdEarned %s, ousdTotal %s, lvUSDBorrowed %s, shares %s",
    //     _positionId,
    //     principle,
    //     ousdEarned,
    //     ousdTotal,
    //     lvUSDBorrowed,
    //     shares,
    // );
}
async function printMiscInfo(_r, _user) {
    const treasuryBalance = getFloatFromBigNum(await _r.externalOUSD.balanceOf(_r.treasurySigner.address));
    const userOUSDBalance = getFloatFromBigNum(await _r.externalOUSD.balanceOf(_user.address));
    const vaultOUSDBalance = getFloatFromBigNum(await _r.vault.totalAssets());
    // logger("OUSD : Treasury balance is %s, Vault Balance is %s, User balance is %s", treasuryBalance, vaultOUSDBalance, userOUSDBalance);
}
const spec2 = 0;
describe("Building basic environment", function () {
    async function setupEnvForIntegrationTestsFixture() {
        // Setup & deploy contracts
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        await hardhat_1.ethers.provider.send("evm_mine");
        owner = r.owner;
        user = r.addr1;
        userOther = r.addr2;
        pretendOUSDRebaseSigner = r.addr3;
        /* ====== Setup accounts and funds ===========
        expected state:
        - admin has 1000 lvUSD and 10 ethereum worth of 3CRV tokens, to fund pool
        - User has 1 ethereum worth (about 2000 OUSDs)  to use as principle
        - pretendOUSDRebaseSigner, which will act as OUSD rebase agent, has 10 ethereum worth (about 20k OUSD)
        */
        // Prep owner accounts with funds needed to fund pool
        await r.lvUSD.setMintDestination(owner.address);
        await r.lvUSD.mint((0, utils_1.parseUnits)("1000.0"));
        // will take 10 ethereum tokens and transfer it to their dollar value of 3CRV
        await (0, MainnetHelper_1.helperSwapETHWith3CRV)(owner, (0, utils_1.parseUnits)("10.0"));
        adminInitial3CRVBalance = getFloatFromBigNum(await r.external3CRV.balanceOf(await owner.getAddress()));
        // Get User some OUSD for principle
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(user, (0, utils_1.parseUnits)("1.0"));
        // Fund pretendOUSDRebaseSigner with OUSD
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(pretendOUSDRebaseSigner, (0, utils_1.parseUnits)("10.0"));
        // fund user with Archtokens
        await r.archToken.connect(r.treasurySigner).transfer(user.address, (0, utils_1.parseUnits)("1000.0"));
        /* ====== admin manual processes ======
        Expected state:
            - Coordinator gets initialCoordinatorLvUSDBalance of lvUSD so it can use it when getting leverage.
        */
        // mint some lvUSD and pass it to coordinator. That lvUSD will be used by coordinator as needed to take leverage
        await r.lvUSD.setMintDestination(r.coordinator.address);
        await r.lvUSD.mint(parseUnitsNum(initialCoordinatorLvUSDBalance));
        await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(r, parseUnitsNum(initialCoordinatorLvUSDBalance));
        /* ====== Setup Pools ===========
        expected state:
        - lvUSD/3CRV pool is set up and is funded with 700 tokens each
          (createAndFundMetapool funds pool with 100 tokens, second call adds 600 more)
        */
        ownerLvUSDBalanceBeforeFunding = getFloatFromBigNum(await r.lvUSD.balanceOf(await owner.getAddress()));
        lvUSD3CRVPoolInstance = r.curveLvUSDPool;
        const fundInPoolAddOnForTestString = fundInPoolAddOnForTest.toString();
        await (0, CurveHelper_1.fundMetapool)(lvUSD3CRVPoolInstance.address, [(0, utils_1.parseUnits)(fundInPoolAddOnForTestString), (0, utils_1.parseUnits)(fundInPoolAddOnForTestString)], owner, r);
        await (0, ContractTestContext_1.setRolesForEndToEnd)(r);
        await hardhat_1.ethers.provider.send("evm_mine");
        return { r };
    }
    describe("Test suit for setting up the stage", function () {
        //  Admin checks
        it("Should be able to transfer admin via two steps process", async function () {
            await (0, hardhat_network_helpers_1.loadFixture)(setupEnvForIntegrationTestsFixture);
            // userOther is not admin
            await (0, chai_1.expect)(r.vault.connect(userOther).takeRebaseFees()).to.be.revertedWith("Caller is not Admin");
            // suggest changing admin
            await r.vault.setAdmin(userOther.address);
            // userOther is still not admin as it did not accept it
            await (0, chai_1.expect)(r.vault.connect(userOther).takeRebaseFees()).to.be.revertedWith("Caller is not Admin");
            // Older admin can still call this
            await r.vault.takeRebaseFees();
            // otherUser accept role as admin
            await r.vault.connect(userOther).acceptAdminRole();
            // otherUser is now admin
            await r.vault.connect(userOther).takeRebaseFees();
            // old admin can not use onlyAdmin methods
            await (0, chai_1.expect)(r.vault.takeRebaseFees()).to.be.revertedWith("Caller is not Admin");
        });
        it("Should be able to transfer admin role back to owner", async function () {
            // const {r} = await loadFixture(setupEnvForIntegrationTestsFixture);
            await r.vault.connect(userOther).setAdmin(owner.address);
            await r.vault.acceptAdminRole();
            await (0, chai_1.expect)(r.vault.connect(userOther).takeRebaseFees()).to.be.revertedWith("Caller is not Admin");
            await r.vault.takeRebaseFees();
        });
        it("Should not not be able to effect auction as not auctioner ", async function () {
            // const {r} = await loadFixture(setupEnvForIntegrationTestsFixture);
            const stopAuctionPromise = r.auction.connect(userOther).stopAuction();
            // const archlevRationChangePromise = r.parameterStore.connect(user).changeArchToLevRatio(parseUnitsNum("100"));
            await (0, chai_1.expect)(stopAuctionPromise).to.revertedWith("Caller is not Auctioneer");
        });
        it("Should be able to change start auction as Auctioneer", async function () {
            await r.auction.setAuctioneer(user.address);
            /// need to stop auction?
            await r.auction.connect(user).startAuctionWithLength(5, parseUnitsNum(100), parseUnitsNum(300));
            // mine a block
            await hardhat_1.ethers.provider.send("evm_mine");
            (0, chai_1.expect)(await r.auction.getCurrentBiddingPrice()).to.eq(parseUnitsNum(140));
        });
        // Checking environment
        it("Should have initialCoordinatorLvUSDBalance lvUSD balance under coordinator", async function () {
            const coordinatorLvUSDBalance = getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address));
            (0, chai_1.expect)(coordinatorLvUSDBalance).to.equal(initialCoordinatorLvUSDBalance);
        });
        it("Should have setup OUSD pretender with OUSD to spend ", async function () {
            const pretenderOUSDbalance = getFloatFromBigNum(await r.externalOUSD.balanceOf(await pretendOUSDRebaseSigner.getAddress()));
            /// since we are exchanging 10 ethereum for the dollar value of token, price is not set. Checking for a reasonable value
            (0, chai_1.expect)(pretenderOUSDbalance).to.greaterThan(1000);
        });
        it("Should have setup user with  enough OUSD to cover principle amount", async function () {
            const userOUSDbalance = getFloatFromBigNum(await r.externalOUSD.balanceOf(await user.getAddress()));
            (0, chai_1.expect)(userOUSDbalance).to.greaterThan(userOUSDPrinciple);
        });
        it("Should have initialFundsInPool as balance of pool", async function () {
            printPoolState(lvUSD3CRVPoolInstance);
            const lvUSDCoinsInPool = await lvUSD3CRVPoolInstance.balances(0);
            const crvCoinsInPool = await lvUSD3CRVPoolInstance.balances(1);
            (0, chai_1.expect)(lvUSDCoinsInPool).to.gte(parseUnitsNum(initialFundsInPool));
            (0, chai_1.expect)(crvCoinsInPool).to.gte(parseUnitsNum(initialFundsInPool));
        });
        it("Should have reduced balance of lvUSD of owner since pool is funded", async function () {
            const adminLvUSDBalance = getFloatFromBigNum(await r.lvUSD.balanceOf(await owner.getAddress()));
            (0, chai_1.expect)(adminLvUSDBalance).to.equal(ownerLvUSDBalanceBeforeFunding - 600);
        });
        it("Should have reduced balance of 3CRV of owner since pool is funded", async function () {
            const admin3CRVBalance = getFloatFromBigNum(await r.external3CRV.balanceOf(await owner.getAddress()));
            (0, chai_1.expect)(admin3CRVBalance).to.lessThan(adminInitial3CRVBalance);
        });
        it("Should only allow Guardian to pause/unpause contract", async function () {
            // Make user Guardian, this is to make sure that Admin can't pause
            await r.leverageEngine.setGuardian(user.address);
            (0, chai_1.expect)(await r.leverageEngine.paused()).to.eq(false);
            const pausePromise = r.leverageEngine.pauseContract();
            await (0, chai_1.expect)(pausePromise).to.revertedWith("Caller is not Guardian");
            await r.leverageEngine.connect(user).pauseContract();
            (0, chai_1.expect)(await r.leverageEngine.paused()).to.eq(true);
            await r.leverageEngine.connect(user).unPauseContract();
            (0, chai_1.expect)(await r.leverageEngine.paused()).to.eq(false);
            await r.leverageEngine.setGuardian(owner.address);
        });
        it("Should not allow unwinding or creating positions if paused", async function () {
            const leverageUserIsTakingIn18Dec = await r.parameterStore.getAllowedLeverageForPosition(userOUSDPrincipleIn18Decimal, numberOfCycles);
            const archCostOfLeverageIn18Dec = await r.parameterStore.calculateArchNeededForLeverage(leverageUserIsTakingIn18Dec);
            await r.leverageEngine.pauseContract();
            const createPromise = approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await (0, chai_1.expect)(createPromise).to.revertedWith("Pausable: paused");
            const unwindPromise = r.leverageEngine.connect(user).unwindLeveragedPosition(0);
            await (0, chai_1.expect)(unwindPromise).to.revertedWith("Pausable: paused");
            // Now unpause and check that we can create position and Unwind
            await r.leverageEngine.unPauseContract();
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await r.leverageEngine.connect(user).unwindLeveragedPosition(0);
        });
    });
    const spec3 = 0;
    describe("Test suit for opening/unwinding positions on imbalanced pools", function () {
        const higherNumberOfCycles = 6;
        const tempUserOUSDPrinciple = 96;
        const tempUserOUSDPrincipleIn18Decimal = parseUnitsNum(tempUserOUSDPrinciple + Math.random())
            .add(ethers_1.BigNumber.from(1 * Math.round(Math.random())));
        let leverageUserIsTakingIn18Dec;
        let archCostOfLeverageIn18Dec;
        async function setUpEnvForTestSuiteFixture() {
            // await loadFixture(setupEnvForIntegrationTestsFixture);
            // fund userOther
            await r.archToken.connect(r.treasurySigner).transfer(userOther.address, (0, utils_1.parseUnits)("1000.0"));
            await (0, MainnetHelper_1.helperSwapETHWithOUSD)(userOther, (0, utils_1.parseUnits)("1.0"));
            await hardhat_1.ethers.provider.send("evm_mine");
            const leverageUserIsTakingIn18Dec = await r.parameterStore.getAllowedLeverageForPosition(tempUserOUSDPrincipleIn18Decimal, higherNumberOfCycles);
            const archCostOfLeverageIn18Dec = await r.parameterStore.calculateArchNeededForLeverage(leverageUserIsTakingIn18Dec);
            await r.parameterStore.changeMinPositionCollateral(parseUnitsNum(20));
            await approveAndGetLeverageAsUser(tempUserOUSDPrincipleIn18Decimal, higherNumberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await approveAndGetLeverageAsUser(tempUserOUSDPrincipleIn18Decimal, higherNumberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await approveAndGetLeverageAsUser(tempUserOUSDPrincipleIn18Decimal, higherNumberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await approveAndGetLeverageAsUser(tempUserOUSDPrincipleIn18Decimal, higherNumberOfCycles, archCostOfLeverageIn18Dec, r, userOther);
            await approveAndGetLeverageAsUser(tempUserOUSDPrincipleIn18Decimal, higherNumberOfCycles, archCostOfLeverageIn18Dec, r, userOther);
            positionId = 0;
        }
        const numOfPositions = 5;
        it("Should have almost empty pool", async function () {
            /// setup fixture
            await (0, hardhat_network_helpers_1.loadFixture)(setupEnvForIntegrationTestsFixture);
            await (0, hardhat_network_helpers_1.loadFixture)(setUpEnvForTestSuiteFixture);
            /// calculate how much lvUSD was used based on numbers from CDP
            let usedlvUSD = 0;
            let spentOUSD = 0;
            for (let i = 0; i < numOfPositions; i++) {
                const lvUSDBorrowed = getFloatFromBigNum(await r.cdp.getLvUSDBorrowed(i));
                const ousdTotal = getFloatFromBigNum(await r.cdp.getOUSDTotalWithoutInterest(i));
                const principle = getFloatFromBigNum(await r.cdp.getOUSDPrinciple(i));
                spentOUSD += ousdTotal - principle;
                usedlvUSD += lvUSDBorrowed;
            }
            const lvUSDCoinsInPool = getFloatFromBigNum(await lvUSD3CRVPoolInstance.balances(0));
            const crvCoinsInPool = getFloatFromBigNum(await lvUSD3CRVPoolInstance.balances(1));
            (0, chai_1.expect)(lvUSDCoinsInPool).to.closeTo(initialFundsInPool + usedlvUSD, 1);
            /// / This is not scientific but we can get away with 2% of transations funds getting used as fees
            (0, chai_1.expect)(crvCoinsInPool).to.closeTo(initialFundsInPool - spentOUSD, spentOUSD * 0.02);
        });
    });
    const spec4 = 0;
    describe("Test suit for moving positions around", function () {
        async function setUpEnvForTestSuiteFixture() {
            await r.archToken.connect(r.treasurySigner).transfer(userOther.address, (0, utils_1.parseUnits)("1000.0"));
            await (0, MainnetHelper_1.helperSwapETHWithOUSD)(userOther, (0, utils_1.parseUnits)("1.0"));
            const leverageUserIsTakingIn18Dec = await r.parameterStore.getAllowedLeverageForPosition(userOUSDPrincipleIn18Decimal, numberOfCycles);
            const archCostOfLeverageIn18Dec = await r.parameterStore.calculateArchNeededForLeverage(leverageUserIsTakingIn18Dec);
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, userOther);
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, userOther);
            positionId = 0;
        }
        it("Should have logged all 5 positions in array", async function () {
            await (0, hardhat_network_helpers_1.loadFixture)(setupEnvForIntegrationTestsFixture);
            await (0, hardhat_network_helpers_1.loadFixture)(setUpEnvForTestSuiteFixture);
            const userTokenIdsArray = await r.positionToken.getTokenIDsArray(user.address);
            const userOtherTokenIdsArray = await r.positionToken.getTokenIDsArray(userOther.address);
            // console.log("\x1B[31mPosition array of User %s, ", userTokenIdsArray);
            (0, chai_1.expect)(userTokenIdsArray[0]).to.eq(ethers_1.BigNumber.from(0));
            (0, chai_1.expect)(userTokenIdsArray[1]).to.eq(ethers_1.BigNumber.from(1));
            (0, chai_1.expect)(userTokenIdsArray[2]).to.eq(ethers_1.BigNumber.from(2));
            (0, chai_1.expect)(userOtherTokenIdsArray[0]).to.eq(ethers_1.BigNumber.from(3));
            (0, chai_1.expect)(userOtherTokenIdsArray[1]).to.eq(ethers_1.BigNumber.from(4));
        });
        it("Should correctly log transfers of ownership", async function () {
            const safeTransferAsUser = r.positionToken.connect(user)["safeTransferFrom(address,address,uint256)"];
            const safeTransferAsUserOther = r.positionToken.connect(userOther)["safeTransferFrom(address,address,uint256)"];
            await safeTransferAsUser(user.address, userOther.address, 1);
            await safeTransferAsUserOther(userOther.address, user.address, 3);
            /// now expecting User : [0,2,3] userOther : [1,4]
            const userTokenIdsArray = await r.positionToken.getTokenIDsArray(user.address);
            const userOtherTokenIdsArray = await r.positionToken.getTokenIDsArray(userOther.address);
            (0, chai_1.expect)(userTokenIdsArray[0]).to.eq(ethers_1.BigNumber.from(0));
            (0, chai_1.expect)(userTokenIdsArray[1]).to.eq(ethers_1.BigNumber.from(2));
            (0, chai_1.expect)(userTokenIdsArray[2]).to.eq(ethers_1.BigNumber.from(3));
            (0, chai_1.expect)(userOtherTokenIdsArray[0]).to.eq(ethers_1.BigNumber.from(1));
            (0, chai_1.expect)(userOtherTokenIdsArray[1]).to.eq(ethers_1.BigNumber.from(4));
            // console.log("\x1B[31mPosition array of User %s :: otherUser %s", userTokenIdsArray,userOtherTokenIdsArray);
        });
        it("Should be able to unwind positions with new owners", async function () {
            await r.leverageEngine.connect(user).unwindLeveragedPosition(2);
            await r.leverageEngine.connect(userOther).unwindLeveragedPosition(4);
            const userTokenIdsArray = await r.positionToken.getTokenIDsArray(user.address);
            const userOtherTokenIdsArray = await r.positionToken.getTokenIDsArray(userOther.address);
            // console.log("\x1B[31mPosition array of User After unwinding %s :: otherUser %s", userTokenIdsArray, userOtherTokenIdsArray);
            (0, chai_1.expect)(userTokenIdsArray[0]).to.eq(ethers_1.BigNumber.from(0));
            (0, chai_1.expect)(userTokenIdsArray[1]).to.eq(ethers_1.BigNumber.from(3));
            (0, chai_1.expect)(userOtherTokenIdsArray[0]).to.eq(ethers_1.BigNumber.from(1));
        });
    });
    const spe5 = 0;
    describe("Test suit for getting leverage", function () {
        let leverageUserIsTaking;
        let archCostOfLeverageIn18Dec;
        let archApprovedForLeverageIn18Dec;
        let archCostOfLeverage;
        let coordinatorlvUSDBalanceBeforePosition;
        let borrowedlvUSD;
        let expectedTreasuryFundsFromPosition;
        let userArchTokenAmountBeforePosition;
        async function setUpEnvForTestSuiteFixture() {
            userArchTokenAmountBeforePosition = getFloatFromBigNum(await r.archToken.balanceOf(user.address));
            coordinatorlvUSDBalanceBeforePosition = getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address));
            // console.log("1: userOUSDPrincipleInEighteenDecimal =" + userOUSDPrincipleIn18Decimal + " userOUSDPrinciple =" + userOUSDPrinciple);
            const leverageUserIsTakingIn18Dec = await r.parameterStore.getAllowedLeverageForPosition(userOUSDPrincipleIn18Decimal, numberOfCycles);
            // console.log("2: Creating positions with leverage = ", leverageUserIsTakingIn18Dec, formatUnits(leverageUserIsTakingIn18Dec));
            leverageUserIsTaking = getFloatFromBigNum(leverageUserIsTakingIn18Dec);
            /// adding buffer for arch
            archCostOfLeverageIn18Dec = await r.parameterStore.calculateArchNeededForLeverage(leverageUserIsTakingIn18Dec);
            // console.log("archCostOfLeverageIn18Dec is %s", archCostOfLeverageIn18Dec);
            archCostOfLeverage = getFloatFromBigNum(archCostOfLeverageIn18Dec);
            // logger("Will take %s leverage that cost %s ArchToken", leverageUserIsTaking, archCostOfLeverage);
            archApprovedForLeverageIn18Dec = archCostOfLeverageIn18Dec;
            /// Notice that it might be needed approve a tiny bit more arch then needed. Currently its exact approval.
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await hardhat_1.ethers.provider.send("evm_mine");
            console.log("5");
            positionId = 0;
        }
        it("Should not have used all the Arch token given for opening Position", async function () {
            await (0, hardhat_network_helpers_1.loadFixture)(setupEnvForIntegrationTestsFixture);
            await (0, hardhat_network_helpers_1.loadFixture)(setUpEnvForTestSuiteFixture);
            // test arch token taken from user is only what is needed
            const archTokenBalanceAfterOpeningPosition = getFloatFromBigNum(await r.archToken.balanceOf(user.address));
            (0, chai_1.expect)(archTokenBalanceAfterOpeningPosition).to.closeTo(userArchTokenAmountBeforePosition - archCostOfLeverage, 0.0001);
        });
        it("Should have created a single position and assign it to user", async function () {
            printPositionState(r, positionId);
            printPoolState(r.curveLvUSDPool);
            printMiscInfo(r, user);
            const nftBalance = await r.positionToken.balanceOf(user.address);
            (0, chai_1.expect)(nftBalance).to.equal(1);
        });
        it("Should have expiration related information for position", async function () {
            const positionTimeOpened = await r.cdp.getPositionTimeOpened(positionId);
            const positionTimeToLive = await r.cdp.getPositionTimeToLive(positionId);
            const positionExpireTime = await r.cdp.getPositionExpireTime(positionId);
            const nowDate = new Date(Date.now());
            const positionTimeOpenedDate = new Date(positionTimeOpened * 1000);
            const positionTimeToLiveDate = new Date(positionTimeToLive * 1000);
            const positionExpireTimeDate = new Date(positionExpireTime * 1000);
            const positionTimeOpenedDay = positionTimeOpenedDate.getDate();
            const positionExpireTimeDay = positionExpireTimeDate.getDate();
            // console.log(
            //     "\x1B[31mPosition Opened Time %s, TTL %s, ExpireTime %s, day is %s, today is %s",
            //     positionTimeOpenedDate,
            //     positionTimeToLiveDate,
            //     positionExpireTimeDate,
            //     positionTimeOpenedDay,
            //     nowDate,
            // );
            /// Date from blockchain depends on the block we start from (blocks from the past happen in the past).
            // Thats why we are checking for a specific date
            (0, chai_1.expect)(positionTimeOpenedDay).to.eq(8);
            (0, chai_1.expect)(positionExpireTimeDay).to.eq(12);
        });
        it("Should have assigned origination fee to treasury", async function () {
            const originationFee = 0.005; // 0.5% // to get number contract use =getFloatFromBigNum(await r.parameterStore.getOriginationFeeRate())
            const treasuryBalance = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            /// origination fee is 0.5% at the moment, lvUSDBorrowed is 185.566111705638819675 so 0.5% of it is roughly
            borrowedlvUSD = getFloatFromBigNum(await r.cdp.getLvUSDBorrowed(positionId));
            expectedTreasuryFundsFromPosition = originationFee * borrowedlvUSD;
            // console.log(
            //     "\x1B[31mSimplePositionCreation: treasury got %s from %s borrowed lvUSD at an origination fee of %s",
            //     treasuryBalance,
            //     borrowedlvUSD,
            //     getFloatFromBigNum(await r.parameterStore.getOriginationFeeRate()),
            // );
            (0, chai_1.expect)(treasuryBalance).to.closeTo(expectedTreasuryFundsFromPosition, 0.1);
        });
        it("Should have deposited leverage and principle in vault (minus fee)", async function () {
            const vaultOUSDBalance = getFloatFromBigNum(await r.vault.totalAssets());
            /// this should be equal to principle + leveraged OUSD - fees = 100 + 171 - 8.5 = 262.5
            const expectedLossDueToBorrowingFromPools = leverageUserIsTaking * 0.001;
            const expectedVaultOUSDBalance = leverageUserIsTaking + userOUSDPrinciple - expectedTreasuryFundsFromPosition;
            // console.log(
            //     "\x1B[31mSimplePositionCreation: %s OUSD assets deposited in vault, expecting %s +- expectedLossDueToBorrowingFromPools (%s) ",
            //     vaultOUSDBalance,
            //     expectedVaultOUSDBalance,
            //     expectedLossDueToBorrowingFromPools,
            // );
            (0, chai_1.expect)(vaultOUSDBalance).to.closeTo(expectedVaultOUSDBalance, expectedLossDueToBorrowingFromPools);
        });
        it("Should have used lvUSD from coordinator", async function () {
            const coordinatorCurrentlvUSD = getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address));
            // console.log(
            //     "\x1B[31mSimplePositionCreation: coordinator had %s lvUSD before creating position.",
            //     coordinatorlvUSDBalanceBeforePosition,
            //     "\x1B[31mAfter creating position and using some lvUSD, coordinator has",
            //     coordinatorCurrentlvUSD,
            //     "\x1B[31mlvUSD",
            // );
            // Using close to due to some integer rounding issues at the very last bit
            (0, chai_1.expect)(coordinatorCurrentlvUSD).to.closeTo(coordinatorlvUSDBalanceBeforePosition - borrowedlvUSD, 0.0000001);
        });
        it("Should have set principle and leverage into vault's address on OUSD ERC20", async function () {
            const vaultOusdBalance = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.vault.address));
            const vaultTotalAssets = getFloatFromBigNum(await r.vault.totalAssets());
            // console.log("\x1B[31mSimplePositionCreation: vault address has %s OUSD under its address ", vaultOusdBalance);
            (0, chai_1.expect)(vaultOusdBalance).to.equal(vaultTotalAssets);
        });
        // /// Rebase happens from here
        const rebaseAmount = 20 + Math.random();
        const rebadeAmountIn18Dec = parseUnitsNum(rebaseAmount).add(ethers_1.BigNumber.from(1 * Math.round(Math.random())));
        let treasuryOUSDBalanceBeforeRebase;
        let vaultAssetsBeforeRebase;
        let rebaseRateFee;
        let cdpInterestEarnedIn18Dec;
        it("Should increase funds in vault when an OUSD rebase happens", async function () {
            // Save some state before we rebase
            treasuryOUSDBalanceBeforeRebase = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            vaultAssetsBeforeRebase = getFloatFromBigNum(await r.vault.totalAssets());
            // Rebase
            // console.log("\x1B[31mSimplePositionCreation:------------REBASE EVENT-----------");
            // console.log("\x1B[31mSimplePositionCreation:REBASE EVENT of  rebaseValue %s", rebadeAmountIn18Dec);
            await r.externalOUSD.connect(pretendOUSDRebaseSigner).transfer(r.vault.address, rebadeAmountIn18Dec);
            // collect fees from rebase
            // temporary change vault executive. In real life, vault calls rebase fee at each deposit/withdraw transaction
            await r.vault.setExecutive(r.owner.address);
            await r.vault.takeRebaseFees();
            // back to normal
            await r.vault.setExecutive(r.coordinator.address);
            rebaseRateFee = getFloatFromBigNum(await r.parameterStore.getRebaseFeeRate());
            const ousdInVaultAfterRebase = getFloatFromBigNum(await r.vault.totalAssets());
            (0, chai_1.expect)(ousdInVaultAfterRebase - vaultAssetsBeforeRebase).to.closeTo(rebaseAmount - rebaseRateFee * rebaseAmount, 0.01);
        });
        it("Should update treasury with rebase fees", async function () {
            const treasuryBalanceAfterRebase = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            rebaseRateFee = getFloatFromBigNum(await r.parameterStore.getRebaseFeeRate());
            // console.log("\x1B[31mSimplePositionCreation: treasury now has %s (increased due to rebaseRateFee)",
            // treasuryBalanceAfterRebase);
            (0, chai_1.expect)(treasuryBalanceAfterRebase).to.closeTo(treasuryOUSDBalanceBeforeRebase + rebaseAmount * rebaseRateFee, 0.001);
        });
        it("Should register rebase amount as interest earned on position", async function () {
            cdpInterestEarnedIn18Dec = await r.cdp.getOUSDInterestEarned(positionId);
            const cdpInterestEarned = getFloatFromBigNum(cdpInterestEarnedIn18Dec);
            // console.log("\x1B[31mSimplePositionCreation: cdp returned %s %s interest earned on position",
            // cdpInterestEarned, cdpInterestEarnedIn18Dec);
            (0, chai_1.expect)(cdpInterestEarned).to.closeTo(rebaseAmount - rebaseAmount * rebaseRateFee, 0.001);
        });
        /// Unwinding Position
        let userOUSDBalanceBeforeUnwindingIn18Dec;
        let contractEstimatedReturnedOUSDMinusInterestFromUnwindingIn18Dec;
        let contractEstimatedReturnedOUSDMinusInterestFromUnwinding;
        let totallvUSDBorrowForPositionIn18Dec;
        let totalOUSDPositionIn18Dec;
        it("Should unwind position and destroy positionID", async function () {
            userOUSDBalanceBeforeUnwindingIn18Dec = await r.externalOUSD.balanceOf(user.address);
            totalOUSDPositionIn18Dec = await r.cdp.getOUSDTotalWithoutInterest(positionId);
            totallvUSDBorrowForPositionIn18Dec = await r.cdp.getLvUSDBorrowed(positionId);
            contractEstimatedReturnedOUSDMinusInterestFromUnwindingIn18Dec = await r.exchanger.estimateOusdReturnedOnUnwindMinusInterest(totalOUSDPositionIn18Dec, totallvUSDBorrowForPositionIn18Dec);
            contractEstimatedReturnedOUSDMinusInterestFromUnwinding =
                getFloatFromBigNum(contractEstimatedReturnedOUSDMinusInterestFromUnwindingIn18Dec);
            await r.leverageEngine.connect(user).unwindLeveragedPosition(positionId);
            const isNFTValid = await r.positionToken.exists(positionId);
            (0, chai_1.expect)(isNFTValid).to.equal(false);
        });
        it("Should transfer OUSD funds (collateral + interest) to user", async function () {
            const userOUSDBalanceAferUnwindingIn18Dec = await r.externalOUSD.balanceOf(user.address);
            const userActualGainsFromUnwinding = getFloatFromBigNum(userOUSDBalanceAferUnwindingIn18Dec) - getFloatFromBigNum(userOUSDBalanceBeforeUnwindingIn18Dec);
            // 2ed to last bit is originationFee, last bit is accepted curve loss
            const expectedUserGainsFromUnwinding = contractEstimatedReturnedOUSDMinusInterestFromUnwinding + getFloatFromBigNum(cdpInterestEarnedIn18Dec) - 0.005 * userOUSDPrinciple;
            (0, chai_1.expect)(userActualGainsFromUnwinding).to.closeTo(expectedUserGainsFromUnwinding, 1);
        });
        /// create and transfer NFT position
        it("Should be able to transfer position and new owner be able to sell it", async function () {
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            const isNFTValid0 = await r.positionToken.exists(positionId);
            const isNFTValid1 = await r.positionToken.exists(positionId + 1);
            const positionIdToTransfer = positionId + 1;
            console.log("isNFTValid0, isNFTValid", isNFTValid0, isNFTValid1);
            const safeTransferAsUser = r.positionToken.connect(user)["safeTransferFrom(address,address,uint256)"];
            await safeTransferAsUser(user.address, userOther.address, positionIdToTransfer);
            (0, chai_1.expect)(await r.positionToken.ownerOf(positionIdToTransfer)).to.equal(userOther.address);
            /// should be able to close position as new owner
            await r.leverageEngine.connect(userOther).unwindLeveragedPosition(positionIdToTransfer);
        });
    });
    const spe6 = 0;
    describe("Test suite for security", function () {
        let archCostOfLeverageIn18Dec;
        const newCoordinatorLvUSDBalance = 1000;
        let secondPoisitionLvUSDBorrowed;
        async function setUpEnvForTestSuiteFixture() {
            const leverageUserIsTakingIn18Dec = await r.parameterStore.getAllowedLeverageForPosition(userOUSDPrincipleIn18Decimal, numberOfCycles);
            archCostOfLeverageIn18Dec = await r.parameterStore.calculateArchNeededForLeverage(leverageUserIsTakingIn18Dec);
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            await hardhat_1.ethers.provider.send("evm_mine");
            positionId = 0;
        }
        async function verifyPositionCreationFails(message, ousdPrinciple = userOUSDPrincipleIn18Decimal, cycles = numberOfCycles, archToGive = archCostOfLeverageIn18Dec) {
            await r.archToken.connect(user).approve(r.leverageEngine.address, archToGive);
            await r.externalOUSD.connect(user).approve(r.leverageEngine.address, ousdPrinciple);
            const promise = r.leverageEngine.connect(user).createLeveragedPosition(ousdPrinciple, cycles, archToGive);
            await (0, chai_1.expect)(promise).to.be.revertedWith(message);
        }
        it("Should make sure coordinator has no leverage", async () => {
            await (0, hardhat_network_helpers_1.loadFixture)(setupEnvForIntegrationTestsFixture);
            await (0, hardhat_network_helpers_1.loadFixture)(setUpEnvForTestSuiteFixture);
            await r.coordinator.resetAndBurnLeverage();
            const coordinatorLvUSDBalance = await r.lvUSD.balanceOf(r.coordinator.address);
            (0, chai_1.expect)(coordinatorLvUSDBalance).to.eq(0);
            const coordinatorLeverageBalance = await r.parameterStore.getCoordinatorLeverageBalance();
            (0, chai_1.expect)(coordinatorLeverageBalance).to.eq(0);
        });
        it("Should not allow any opening of position as no leverage is available", async () => {
            await verifyPositionCreationFails("Not enough available leverage");
        });
        it("should not allow leverage to be risen if lvUSD balance is not correct", async () => {
            await r.auction.startAuctionWithLength(5, hardhat_1.ethers.utils.parseUnits("300.0"), hardhat_1.ethers.utils.parseUnits("301.0"));
            const promise = r.coordinator.acceptLeverageAmount(parseUnitsNum(initialCoordinatorLvUSDBalance * 2));
            await (0, chai_1.expect)(promise).to.be.revertedWith("lvUSD !< levAmt");
            /// Wait for auction to end
            for (let i = 0; i < 5 + 1; i++) {
                await hardhat_1.ethers.provider.send("evm_mine");
            }
            // To be extra sure, try to open position and see it fails
            await verifyPositionCreationFails("Not enough available leverage");
        });
        it("Should not allow to open position even if lvUSD balance of Coordinator is high (if leverage is not set)", async () => {
            await r.lvUSD.setMintDestination(r.coordinator.address);
            await r.lvUSD.mint(parseUnitsNum(newCoordinatorLvUSDBalance));
            // To be extra sure, try to open position and see it fails
            await verifyPositionCreationFails("Not enough available leverage");
            // Make sure available leverage does not change
            const leverageAvailable = await r.coordinator.getAvailableLeverage();
            (0, chai_1.expect)(leverageAvailable).to.equal(0);
        });
        it("Should create position when setting leverage + lvUSD balance", async () => {
            const nftShouldNotExists = await r.positionToken.exists(1);
            (0, chai_1.expect)(nftShouldNotExists).to.equal(false);
            await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(r, parseUnitsNum(newCoordinatorLvUSDBalance));
            await approveAndGetLeverageAsUser(userOUSDPrincipleIn18Decimal, numberOfCycles, archCostOfLeverageIn18Dec, r, user);
            const nftExists = await r.positionToken.exists(1);
            (0, chai_1.expect)(nftExists).to.equal(true);
        });
        it("Should update leverage available when taking position", async () => {
            secondPoisitionLvUSDBorrowed = getFloatFromBigNum(await r.cdp.getLvUSDBorrowed(1));
            const leverageAvailable = getFloatFromBigNum(await r.coordinator.getAvailableLeverage());
            (0, chai_1.expect)(newCoordinatorLvUSDBalance - secondPoisitionLvUSDBorrowed).to.closeTo(leverageAvailable, 0.0000001);
        });
        it("Should not increase available leverage if more lvUSD is minted to coordinator", async () => {
            const beforeMintingLeverageAmount = getFloatFromBigNum(await r.coordinator.getAvailableLeverage());
            await r.lvUSD.setMintDestination(r.coordinator.address);
            await r.lvUSD.mint(parseUnitsNum(newCoordinatorLvUSDBalance));
            /// Make sure correct balanceOf on lvUSD
            (0, chai_1.expect)(getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address))).to.closeTo(newCoordinatorLvUSDBalance + beforeMintingLeverageAmount, 1);
            /// make sure leverage available doesn't change
            const leverageAvailable = getFloatFromBigNum(await r.coordinator.getAvailableLeverage());
            (0, chai_1.expect)(beforeMintingLeverageAmount).to.eq(leverageAvailable);
        });
        it("Should not allow to open more positions even if lvUSD balance of coordinator is high enough, once leverage accepted is used", async () => {
            await approveAndGetLeverageAsUser(parseUnitsNum(100), 7, parseUnitsNum(100), r, user);
            await verifyPositionCreationFails("Not enough available leverage", parseUnitsNum(100), 7, parseUnitsNum(100));
        });
    });
    const endthis = 0;
});