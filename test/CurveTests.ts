import { ethers } from "hardhat";
import { expect } from "chai";
import { helperResetNetwork, helperSwapETHWith3CRV, defaultBlockNumber } from "./MainnetHelper";
import { createMetapool, getMetapool, fundMetapool, createAndFundMetapool, exchangeLvUSDfor3CRV, exchange3CRVfor3LvUSD } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("CurveHelper Test Suite", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;

    beforeEach(async function () {
        // Reset network before integration tests
        helperResetNetwork(defaultBlockNumber);
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        owner = r.owner;
    });

    it("Should create a 3CRV+LvUSD Metapool", async function () {
        let poolAddress = ethers.constants.AddressZero;
        poolAddress = await createMetapool(lvUSD, owner);
        expect(poolAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should get values of a Metapool", async function () {
        const token = lvUSD;
        const pool = await getMetapool(await createMetapool(token, owner), owner);
        // coins[0] is our token.
        // coins[1] is the basepool (3crv)
        expect(await pool.coins(0)).to.eq(token.address);
    });

    it("Should fund a Metapool", async function () {
        const addressPool = await createMetapool(lvUSD, owner);
        const pool = await getMetapool(addressPool, owner);
        const amountLvUSDBefore = await pool.balances(0);
        const amountLvUSDtoFund = ethers.utils.parseEther("5.0");
        const amount3CRVBefore = await pool.balances(1);
        const amount3CRVtoFund = ethers.utils.parseEther("6.0");
        /**
         * @dev fundMetapool(address, [amount1, amount2], signer)
         * @param address: pool address
         * @param amount1: amount of pool.coins(0) to add into the pool
         * @param amount2: amount of pool.coins(1) to add into the pool
         * @dev in our case amount1 = LvUSD & amount2 = 3crv
         */
        await fundMetapool(addressPool, [amountLvUSDtoFund, amount3CRVtoFund], owner, r);
        // Check LvUSD
        expect(await pool.balances(0)).to.be.gt(amountLvUSDBefore);
        // Check 3CRV
        expect(await pool.balances(1)).to.be.gt(amount3CRVBefore);
    });

    it("Should createAndFundMetapool() in one function", async function () {
        // fundedAmount of 200 is hardcoded in helper
        const fundedAmount = ethers.utils.parseEther("200.0");
        /** Create and fund a lvusd/3crv Metapool
         * funds the pool with hardcoded 100 ETH of LvUSD & 3CRV
         * @dev fundMetapool(signer, ContractContextTest)
         */
        const pool = await createAndFundMetapool(owner, r);
        // console.log("balances %s, %s", await pool.balances(0), await pool.balances(1));
        expect(await pool.balances(0)).to.eq(fundedAmount);
        expect(await pool.balances(1)).to.eq(fundedAmount);
    });

    it("Should be able to fund a Metapool multiple times", async function () {
        // fundedAmount of 200 is hardcoded in helper
        const initalAmount = ethers.utils.parseEther("200.0");
        const addedAmount = ethers.utils.parseEther("4.0");
        const pool = await createAndFundMetapool(owner, r);
        expect(await pool.balances(0)).to.eq(initalAmount);
        expect(await pool.balances(1)).to.eq(initalAmount);
        await fundMetapool(pool.address, [addedAmount, addedAmount], owner, r);
        const newBal = await pool.balances(0);
        expect(await pool.balances(0)).to.be.gt(initalAmount);
        expect(await pool.balances(1)).to.be.gt(initalAmount);
        await fundMetapool(pool.address, [addedAmount, addedAmount], owner, r);
        expect(await pool.balances(0)).to.be.gt(newBal);
    });

    it("Should exchange X for Y", async function () {
        expect(true);
    });

    it("Should exchange Y for X", async function () {
        expect(true);
    });
});
