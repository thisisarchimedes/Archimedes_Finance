import { ethers } from "hardhat";
import { expect } from "chai";
import { helperResetNetwork, defaultBlockNumber } from "./MainnetHelper";
import { fundMetapool, fundedPoolAmount } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("CurveHelper Test Suite", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;
    let pool;

    beforeEach(async function () {
        // Reset network before integration tests
        await helperResetNetwork(defaultBlockNumber);
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        owner = r.owner;
        pool = r.curveLvUSDPool;
    });

    // A pool is created in the buildContractTestContext();
    it("Should create a 3CRV+LvUSD Metapool", async function () {
        expect(pool.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should get values of a Metapool", async function () {
        expect(await pool.coins(0)).to.eq(lvUSD.address);
        expect(await pool.decimals()).to.eq(18);
        expect(await pool.A()).to.eq(1337);
    });

    it("Should be able to fund a Metapool multiple times", async function () {
        // "fundedPoolAmount" from CurveHelper
        const initalAmount = fundedPoolAmount;
        const addedAmount = ethers.utils.parseEther("100.0");
        const pool = r.curveLvUSDPool;
        expect(await pool.balances(0)).to.eq(initalAmount);
        await fundMetapool(pool.address, [addedAmount, addedAmount], owner, r);
        expect(await pool.balances(0)).to.be.eq(initalAmount.add(addedAmount));
        await fundMetapool(pool.address, [addedAmount, addedAmount], owner, r);
        expect(await pool.balances(0)).to.be.eq(initalAmount.add(addedAmount).add(addedAmount));
    });

    it("Should exchange X for Y", async function () {
        expect(true);
    });

    it("Should exchange Y for X", async function () {
        expect(true);
    });
});
