"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const CurveHelper_1 = require("./CurveHelper");
const ContractTestContext_1 = require("./ContractTestContext");
describe("CurveHelper Test Suite", function () {
    let owner;
    let r;
    let lvUSD;
    let token3CRV;
    let pool;
    beforeEach(async function () {
        // Setup & deploy contracts
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        owner = r.owner;
        pool = r.curveLvUSDPool;
    });
    // A pool is created in the buildContractTestContext();
    it("Should create a 3CRV+LvUSD Metapool", async function () {
        (0, chai_1.expect)(pool.address).to.not.equal(hardhat_1.ethers.constants.AddressZero);
    });
    it("Should get values of a Metapool", async function () {
        const token = lvUSD;
        (0, chai_1.expect)(await pool.coins(0)).to.eq(token.address);
    });
    it("Should fund a Metapool", async function () {
        const amountToAdd = hardhat_1.ethers.utils.parseUnits("100.0");
        const initLvUSD = await lvUSD.balanceOf(pool.address);
        const init3CRV = await token3CRV.balanceOf(pool.address);
        await (0, CurveHelper_1.fundMetapool)(pool.address, [amountToAdd, amountToAdd], owner, r);
        const newLvUSD = await lvUSD.balanceOf(pool.address);
        const new3CRV = await token3CRV.balanceOf(pool.address);
        (0, chai_1.expect)(newLvUSD).to.eq(initLvUSD.add(amountToAdd));
        (0, chai_1.expect)(new3CRV).to.eq(init3CRV.add(amountToAdd));
    });
    it("Should be able to fund a Metapool multiple times", async function () {
        const amountToAdd = hardhat_1.ethers.utils.parseUnits("100.0");
        const initLvUSD = await lvUSD.balanceOf(pool.address);
        const init3CRV = await token3CRV.balanceOf(pool.address);
        await (0, CurveHelper_1.fundMetapool)(pool.address, [amountToAdd, amountToAdd], owner, r);
        await (0, CurveHelper_1.fundMetapool)(pool.address, [amountToAdd, amountToAdd], owner, r);
        await (0, CurveHelper_1.fundMetapool)(pool.address, [amountToAdd, amountToAdd], owner, r);
        const newLvUSD = await lvUSD.balanceOf(pool.address);
        const new3CRV = await token3CRV.balanceOf(pool.address);
        (0, chai_1.expect)(newLvUSD).to.eq(initLvUSD.add(amountToAdd).add(amountToAdd).add(amountToAdd));
        (0, chai_1.expect)(new3CRV).to.eq(init3CRV.add(amountToAdd).add(amountToAdd).add(amountToAdd));
    });
});
