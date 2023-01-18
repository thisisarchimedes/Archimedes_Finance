"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ContractTestContext_1 = require("./ContractTestContext");
const utils_1 = require("ethers/lib/utils");
const oneK = 1000;
const oneK18Decimal = (0, utils_1.parseUnits)(oneK.toString(), 18);
const twentyK18Decimal = (0, utils_1.parseUnits)("20000", 18);
function getFloatFromBigNum(bigNumValue, dec = 18) {
    return parseFloat((0, utils_1.formatUnits)(bigNumValue, dec));
}
describe("PoolManager test suit", async function () {
    let r;
    before(async () => {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        await r.lvUSD.setMintDestination(r.coordinator.address);
        // mint a bit lvUSD
        await r.lvUSD.mint(twentyK18Decimal);
        // Approve pool manager to access 3CRV and lvUSD funds
        await r.external3CRV.approve(r.poolManager.address, oneK18Decimal);
        await r.lvUSD.approve(r.poolManager.address, oneK18Decimal);
    });
    it("Should have enough funds in account and coordinator", async function () {
        /// Sanity check for funds in account. Does not test anything in Pool Manager.
        (0, chai_1.expect)(getFloatFromBigNum(await r.external3CRV.balanceOf(r.owner.address))).to.be.gt(3400);
        (0, chai_1.expect)(getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address))).to.be.eq(20000);
    });
    it("Should fail to fund pool if not enough lvUSD on coordinator", async function () {
        const tooMuchLvUSDAmount = (0, utils_1.parseUnits)("200000");
        const promise = r.poolManager.fundPoolWith3CRV(r.owner.address, tooMuchLvUSDAmount);
        await (0, chai_1.expect)(promise).to.be.revertedWith("Insufficient lvUSD on Coord");
    });
    it("Should fund pool with both lvUSD and USDC", async function () {
        const tokenOneBalanceBefore = getFloatFromBigNum(await r.curveLvUSDPool.balances(0));
        const tokenTwoBalanceBefore = getFloatFromBigNum(await r.curveLvUSDPool.balances(1));
        await r.poolManager.fundPoolWith3CRV(r.owner.address, oneK18Decimal);
        (0, chai_1.expect)(getFloatFromBigNum(await r.curveLvUSDPool.balances(0))).to.be.eq(tokenOneBalanceBefore + oneK);
        (0, chai_1.expect)(getFloatFromBigNum(await r.curveLvUSDPool.balances(1))).to.be.eq(tokenTwoBalanceBefore + oneK);
    });
});
