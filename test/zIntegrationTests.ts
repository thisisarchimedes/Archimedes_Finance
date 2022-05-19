import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits, formatUnits } from "ethers/lib/utils";
import { expect } from "chai";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber, helperSwapETHWith3CRV } from "./MainnetHelper";
import { createAndFundMetapool, fundMetapool } from "./CurveHelper";

let r: ContractTestContext;
let owner: SignerWithAddress;
let user: SignerWithAddress;
let pretendOUSDRebaseSigner : SignerWithAddress;
let lvUSD3CRVPoolInstance;

const userOUSDPrinciple = 100;
const initialFundsInPool = 700;
const initialCoordinatorLvUSDBalance = 10000;
const initialUserLevAllocation = 10000;

let adminInitial3CRVBalance: number;

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

    lvUSD3CRVPoolInstance = await createAndFundMetapool(owner, r);
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
        expect(adminLvUSDBalance).to.equal(300);
    });

    it("Should have reduced balance of 3CRV of owner since pool is funded", async function () {
        const admin3CRVBalance = getFloatFromBigNum(await r.external3CRV.balanceOf(await owner.getAddress()));
        expect(admin3CRVBalance).to.lessThan(adminInitial3CRVBalance);
    });

    it("Should have set a big leverage allocation for user", async function () {
        expect(await r.leverageAllocator.getAddressToLvUSDAvailable(await user.getAddress())).to.equal(parseUnitsNum(initialUserLevAllocation));
    });
});
