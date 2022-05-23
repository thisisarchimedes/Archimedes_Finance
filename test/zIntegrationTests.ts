import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits, formatUnits } from "ethers/lib/utils";
import { expect } from "chai";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber, helperSwapETHWith3CRV } from "./MainnetHelper";
import { createAndFundMetapool, fundMetapool } from "./CurveHelper";
import { BigNumber } from "ethers";

let r: ContractTestContext;
let owner: SignerWithAddress;
let user: SignerWithAddress;
let pretendOUSDRebaseSigner : SignerWithAddress;
let lvUSD3CRVPoolInstance;

const userOUSDPrinciple = 100;
const initialFundsInPool = 800;
const initialCoordinatorLvUSDBalance = 10000;
const initialUserLevAllocation = 10000;

const numberOfCycles = 2;
const userOUSDPrincipleInEighteenDecimal = parseUnitsNum(userOUSDPrinciple);

let positionId: number;
let adminInitial3CRVBalance: number;
let ownerLvUSDBalanceBeforeFunding: number;

async function approveAndGetLeverageAsUser (
    _principleOUSD: BigNumber, _numberOfCycles:number, _r: ContractTestContext, _user: SignerWithAddress,
) {
    await _r.externalOUSD.connect(_user).approve(_r.leverageEngine.address, _principleOUSD);
    await _r.leverageEngine.connect(_user).createLeveragedPosition(_principleOUSD, _numberOfCycles);
}

function parseUnitsNum (num) {
    return parseUnits(num.toString());
}

function getFloatFromBigNum (bigNumValue) {
    return parseFloat(formatUnits(bigNumValue));
}

async function printPoolState (poolInstance) {
    console.log(
        "Pool has %s coin0/lvUSD and %s coin1/3CRV",
        getFloatFromBigNum(await poolInstance.balances(0)),
        getFloatFromBigNum(await poolInstance.balances(1)),
    );
}

async function printPositionState (_r, _positionId, overviewMessage = "Printing Position State") {
    await console.log(overviewMessage);
    const principle = getFloatFromBigNum(await _r.cdp.getOUSDPrinciple(_positionId));
    const ousdEarned = getFloatFromBigNum(await _r.cdp.getOUSDInterestEarned(_positionId));
    const ousdTotal = getFloatFromBigNum(await _r.cdp.getOUSDTotal(_positionId));
    const lvUSDBorrowed = getFloatFromBigNum(await _r.cdp.getLvUSDBorrowed(_positionId));
    const shares = getFloatFromBigNum(await _r.cdp.getShares(_positionId));
    console.log("Stats for NFT %s: principle %s, ousdEarned %s, ousdTotal %s, lvUSDBorrowed %s, shares %s",
        _positionId, principle, ousdEarned, ousdTotal, lvUSDBorrowed, shares);
}

async function printMiscInfo (_r, _user) {
    const treasuryBalance = getFloatFromBigNum(
        await _r.externalOUSD.balanceOf(_r.treasurySigner.address),
    );
    const userOUSDBalance = getFloatFromBigNum(
        await _r.externalOUSD.balanceOf(_user.address),
    );
    const vaultOUSDBalance = getFloatFromBigNum(await _r.vault.totalAssets());
    console.log("OUSD : Treasury balance is %s, Vault Balance is %s, User balance is %s", treasuryBalance, vaultOUSDBalance, userOUSDBalance);
}

async function setupEnvForIntegrationTests () {
    // Reset network before integration tests
    await helperResetNetwork(defaultBlockNumber);

    // Setup & deploy contracts
    r = await buildContractTestContext();
    owner = r.owner;
    user = r.addr1;
    pretendOUSDRebaseSigner = r.addr3;

    /* ====== Setup accounts and funds ===========
    expected state:
    - admin has 1000 lvUSD and 10 ethereum worth of 3CRV tokens, to fund pool
    - User has 1 ethereum worth (about 2000 OUSDs)  to use as principle
    - pretendOUSDRebaseSigner, which will act as OUSD rebase agent, has 10 ethereum worth (about 20k OUSD)
    */

    // Prep owner accounts with funds needed to fund pool
    await r.lvUSD.mint(await owner.getAddress(), parseUnits("1000.0"));

    // will take 10 ethereum tokens and transfer it to their dollar value of 3CRV
    await helperSwapETHWith3CRV(owner, parseUnits("10.0"));

    adminInitial3CRVBalance = getFloatFromBigNum(await r.external3CRV.balanceOf(await owner.getAddress()));
    // Get User some OUSD for principle
    await helperSwapETHWithOUSD(user, parseUnits("1.0"));

    // Fund pretendOUSDRebaseSigner with OUSD
    await helperSwapETHWithOUSD(pretendOUSDRebaseSigner, parseUnits("10.0"));

    /* ====== admin manual processes ======
    Expected state:
        - User gets lots of leverage allocation
        - Coordinator gets initialCoordinatorLvUSDBalance of lvUSD so it can use it when getting leverage.
    */

    await r.leverageAllocator.setAddressToLvUSDAvailable(await user.getAddress(), parseUnitsNum(initialUserLevAllocation));
    // mint some lvUSD and pass it to coordinator. That lvUSD will be used by coordinator as needed to take leverage
    await r.lvUSD.mint(await r.coordinator.address, parseUnitsNum(initialCoordinatorLvUSDBalance));

    /* ====== Setup Pools ===========
    expected state:
    - lvUSD/3CRV pool is set up and is funded with 700 tokens each
      (createAndFundMetapool funds pool with 100 tokens, second call adds 600 more)
    */
    ownerLvUSDBalanceBeforeFunding = getFloatFromBigNum(await r.lvUSD.balanceOf(await owner.getAddress()));
    lvUSD3CRVPoolInstance = r.curveLvUSDPool;
    await fundMetapool(lvUSD3CRVPoolInstance.address, [parseUnits("600.0"), parseUnits("600.0")], owner, r);
}

describe("Test suit for setting up the stage", function () {
    before(async function () {
        await setupEnvForIntegrationTests();
    });

    it("Should have initialCoordinatorLvUSDBalance lvUSD balance under coordinator", async function () {
        const coordinatorLvUSDBalance = getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address));
        expect(coordinatorLvUSDBalance).to.equal(initialCoordinatorLvUSDBalance);
    });

    it("Should have setup OUSD pretender with OUSD to spend ", async function () {
        const pretenderOUSDbalance = getFloatFromBigNum(await r.externalOUSD.balanceOf(await pretendOUSDRebaseSigner.getAddress()));
        /// since we are exchanging 10 ethereum for the dollar value of token, price is not set. Checking for a reasonable value
        expect(pretenderOUSDbalance).to.greaterThan(1000);
    });

    it("Should have setup user with  enough OUSD to cover principle amount", async function () {
        const userOUSDbalance = getFloatFromBigNum(await r.externalOUSD.balanceOf(await user.getAddress()));
        expect(userOUSDbalance).to.greaterThan(userOUSDPrinciple);
    });

    it("Should have initialFundsInPool as balance of pool", async function () {
        printPoolState(lvUSD3CRVPoolInstance);
        const lvUSDCoinsInPool = await lvUSD3CRVPoolInstance.balances(0);
        const crvCoinsInPool = await lvUSD3CRVPoolInstance.balances(1);
        expect(lvUSDCoinsInPool).to.eq(parseUnitsNum(initialFundsInPool));
        expect(crvCoinsInPool).to.eq(parseUnitsNum(initialFundsInPool));
    });

    it("Should have reduced balance of lvUSD of owner since pool is funded", async function () {
        const adminLvUSDBalance = getFloatFromBigNum(await r.lvUSD.balanceOf(await owner.getAddress()));
        expect(adminLvUSDBalance).to.equal(ownerLvUSDBalanceBeforeFunding - 600);
    });

    it("Should have reduced balance of 3CRV of owner since pool is funded", async function () {
        const admin3CRVBalance = getFloatFromBigNum(await r.external3CRV.balanceOf(await owner.getAddress()));
        expect(admin3CRVBalance).to.lessThan(adminInitial3CRVBalance);
    });

    it("Should have set a big leverage allocation for user", async function () {
        expect(await r.leverageAllocator.getAddressToLvUSDAvailable(await user.getAddress())).to.equal(parseUnitsNum(initialUserLevAllocation));
    });
});

describe("Test suit for getting leverage", function () {
    let leverageUserIsTaking: number;

    before(async function () {
        await setupEnvForIntegrationTests();
        leverageUserIsTaking = getFloatFromBigNum(
            await r.parameterStore.getAllowedLeverageForPosition(userOUSDPrincipleInEighteenDecimal, numberOfCycles));
        console.log("Will take %s lev while user has allocation of %s", leverageUserIsTaking,
            getFloatFromBigNum(await r.leverageAllocator.getAddressToLvUSDAvailable(user.address)));

        await approveAndGetLeverageAsUser(userOUSDPrincipleInEighteenDecimal, numberOfCycles, r, user);
        positionId = 0;
    });

    it("Should have created a single position and assign it to user", async function () {
        printPositionState(r, positionId);
        printPoolState(r.curveLvUSDPool);
        printMiscInfo(r, user);
        const nftBalance = await r.positionToken.balanceOf(user.address);
        expect(nftBalance).to.equal(1);
    });

    it("Should have assigned origination fee to treasury", async function () {
        const treasuryBalance = getFloatFromBigNum(
            await r.externalOUSD.balanceOf(r.treasurySigner.address),
        );
        /// origination fee is 5% at the moment, lvUSDBorrowed is 171 so 5% of it is roughly 8.5
        expect(treasuryBalance).to.closeTo(8.5, 0.1);
    });

    it("Should have deposited leverage and principle in vault (minus fee)", async function () {
        const vaultOUSDBalance = getFloatFromBigNum(await r.vault.totalAssets());
        /// this should be equal to principle + leveraged OUSD - fees = 100 + 171 - 8.5 = 262.5
        expect(vaultOUSDBalance).to.closeTo(262, 1);
    });

    it("Should have reduced lev allocation", async function () {
        const allowedLev = getFloatFromBigNum(await r.leverageAllocator.getAddressToLvUSDAvailable(user.address));
        expect(allowedLev).to.equal(initialUserLevAllocation - leverageUserIsTaking);
    });
});

describe("test suit for rebase events", function () {
    const rebaseAmount = 20;
    before(async function () {
        await setupEnvForIntegrationTests();
        await approveAndGetLeverageAsUser(userOUSDPrincipleInEighteenDecimal, numberOfCycles, r, user);
        positionId = 0;
        // at this stage we have a position created. Now simulating a rebase
        await r.externalOUSD.connect(pretendOUSDRebaseSigner).transfer(r.vault.address, parseUnitsNum(rebaseAmount));
        // take fees
        await r.vault.takeRebaseFees();
    });
    it("Should update treasury with rebase fees", async function () {
        printPositionState(r, positionId);
        printMiscInfo(r, user);
        const treasuryBalance = getFloatFromBigNum(
            await r.externalOUSD.balanceOf(r.treasurySigner.address),
        );
        /// treasury should have originationFee + rebaseFee = 8.5 + 20*0.1 = 8.5+2 = 10.5
        expect(treasuryBalance).to.closeTo(10.5, 0.1);
    });

    it("Should update assets deposited in vault", async function () {
        const vaultOUSDBalance = getFloatFromBigNum(await r.vault.totalAssets());
        /// vault should have deposited funds + OUSDRebase after fee = ~262 + (20-20*0.1) = 262 + 18 = 280
        expect(vaultOUSDBalance).to.closeTo(280, 0.5);
    });

    // TODO : OUSDEarned is not being updated at the moment.
    // It can be a view that does a previewRedeem on vault with position shares and OUSDEarned is the delta with that and OUSDTotal
});
