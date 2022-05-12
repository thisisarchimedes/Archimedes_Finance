import { ethers } from "hardhat";
import { expect } from "chai";
import { helperResetNetwork, helperSwapETHWith3CRV } from "./MainnetHelper";
import { createMetapool, getMetapool, fundMetapool, setupMetapool, exchangeLvUSDfor3CRV, exchange3CRVfor3LvUSD } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("CurveHelper Test Suite", function () {
    let owner;
    let user1;
    let user2;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;

    beforeEach(async function () {
        // Reset network before integration tests
        helperResetNetwork(14533286);
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        [owner, user1, user2] = await ethers.getSigners();
        // Mint 200 ETH of LvUSD for owner
        await lvUSD.mint(owner.address, ethers.utils.parseEther("200.0"));
        // Swap 200 ETH of 3CRV for owner
        await helperSwapETHWith3CRV(owner, ethers.utils.parseEther("200.0"));
    });

    it("Initialize test funds", async function () {
        // Make sure "owner" has funds needed for testing from "beforeEach" section
        expect(await lvUSD.balanceOf(owner.address)).to.eq(ethers.utils.parseEther("200.0"));
        expect(await token3CRV.balanceOf(owner.address)).gt(0);
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
        const amountLvUSD = ethers.utils.parseEther("5.0");
        const amount3CRV = ethers.utils.parseEther("6.0");
        /**
         * @dev fundMetapool(address, [amount1, amount2], signer)
         * @param address: pool address
         * @param amount1: amount of pool.coins(0) to add into the pool
         * @param amount2: amount of pool.coins(1) to add into the pool
         * @dev in our case amount1 = LvUSD & amount2 = 3crv
         */
        await fundMetapool(addressPool, [amountLvUSD, amount3CRV], owner, r);
        // Check LvUSD
        expect(await lvUSD.balanceOf(addressPool)).to.eq(amountLvUSD);
        expect(await pool.balances(0)).to.eq(amountLvUSD);
        // Check 3CRV
        expect(await token3CRV.balanceOf(addressPool)).to.eq(amount3CRV);
        expect(await pool.balances(1)).to.eq(amount3CRV);
    });

    it("Should setup (create and fund) a Metapool", async function () {
        const fundedAmount = ethers.utils.parseEther("100.0");
        /** Create and fund a lvusd/3crv Metapool
         * funds the pool with hardcoded 100 ETH of LvUSD & 3CRV
         * @dev fundMetapool(signer, ContractContextTest)
         */
        const pool = await setupMetapool(owner, r);
        expect(await pool.balances(0)).to.eq(fundedAmount);
        expect(await pool.balances(1)).to.eq(fundedAmount);
    });

    it("Should exchange X for Y", async function () {});

    it("Should exchange Y for X", async function () {});
});
