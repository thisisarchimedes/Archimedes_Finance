import { ethers } from "hardhat";
import { expect } from "chai";
import { fundMetapool } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("CurveHelper Test Suite", function () {
    let owner;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;
    let pool;

    beforeEach(async function () {
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
        const token = lvUSD;
        expect(await pool.coins(0)).to.eq(token.address);
    });

    it("Should fund a Metapool", async function () {
        const amountToAdd = ethers.utils.parseUnits("100.0");
        const initLvUSD = await lvUSD.balanceOf(pool.address);
        const init3CRV = await token3CRV.balanceOf(pool.address);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], owner, r);
        const newLvUSD = await lvUSD.balanceOf(pool.address);
        const new3CRV = await token3CRV.balanceOf(pool.address);
        expect(newLvUSD).to.eq(initLvUSD.add(amountToAdd));
        expect(new3CRV).to.eq(init3CRV.add(amountToAdd));
    });

    it("Should be able to fund a Metapool multiple times", async function () {
        const amountToAdd = ethers.utils.parseUnits("100.0");
        const initLvUSD = await lvUSD.balanceOf(pool.address);
        const init3CRV = await token3CRV.balanceOf(pool.address);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], owner, r);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], owner, r);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], owner, r);
        const newLvUSD = await lvUSD.balanceOf(pool.address);
        const new3CRV = await token3CRV.balanceOf(pool.address);
        expect(newLvUSD).to.eq(initLvUSD.add(amountToAdd).add(amountToAdd).add(amountToAdd));
        expect(new3CRV).to.eq(init3CRV.add(amountToAdd).add(amountToAdd).add(amountToAdd));
    });
});
