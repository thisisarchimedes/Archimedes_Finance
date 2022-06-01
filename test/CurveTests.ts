import { ethers } from "hardhat";
import { expect } from "chai";
import { fundMetapool } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("CurveHelper Test Suite", function () {
    let r: ContractTestContext;
    let token3CRV;
    let pool;

    beforeEach(async function () {
        // Setup & deploy contracts
        r = await buildContractTestContext();
        token3CRV = r.external3CRV;
        pool = r.curveLvUSDPool;
    });

    // A pool is created in the buildContractTestContext();
    it("Should create a 3CRV+LvUSD Metapool", async function () {
        expect(pool.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should get values of a Metapool", async function () {
        expect(await pool.coins(0)).to.eq(r.lvUSDToken.address);
    });

    it("Should fund a Metapool", async function () {
        const amountToAdd = ethers.utils.parseUnits("100.0");
        const initLvUSD = await r.lvUSDToken.balanceOf(pool.address);
        const init3CRV = await token3CRV.balanceOf(pool.address);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], r.owner, r);
        const newLvUSD = await r.lvUSDToken.balanceOf(pool.address);
        const new3CRV = await token3CRV.balanceOf(pool.address);
        expect(newLvUSD).to.eq(initLvUSD.add(amountToAdd));
        expect(new3CRV).to.eq(init3CRV.add(amountToAdd));
    });

    it("Should be able to fund a Metapool multiple times", async function () {
        const amountToAdd = ethers.utils.parseUnits("100.0");
        const initLvUSD = await r.lvUSDToken.balanceOf(pool.address);
        const init3CRV = await token3CRV.balanceOf(pool.address);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], r.owner, r);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], r.owner, r);
        await fundMetapool(pool.address, [amountToAdd, amountToAdd], r.owner, r);
        const newLvUSD = await r.lvUSDToken.balanceOf(pool.address);
        const new3CRV = await token3CRV.balanceOf(pool.address);
        expect(newLvUSD).to.eq(initLvUSD.add(amountToAdd).add(amountToAdd).add(amountToAdd));
        expect(new3CRV).to.eq(init3CRV.add(amountToAdd).add(amountToAdd).add(amountToAdd));
    });
});
