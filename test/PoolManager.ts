import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import {
    addressOUSD, abiOUSDToken,
    addressUSDT, abiUSDTToken,
    address3CRV, abi3CRVToken,
    addressCurveOUSDPool,
    address3CRVlvUSDPool,
    helperSwapETHWith3CRV,
    helperResetNetwork,
    defaultBlockNumber,
    addressZap,
    addressUSDC,
} from "./MainnetHelper";
import { abiUSDC, abilvUSD3CRVPool } from "../test/ABIs";

import { impersonateAccount, fundAccount, stopImpersonate, addresslvUSDToken } from "../integrationTests/IntegrationTestContext";
import { Contract } from "ethers"; // Circle's address
import { parseUnits, formatUnits } from "ethers/lib/utils";

const About4700 = "0x1000000000000000000";
const tenK18Decimal = parseUnits("1000", 18);
const nineHunderedK18Decimal = parseUnits("900", 18);
const twentyK18Decimal = parseUnits("20000", 18);

const tenK6Decimal = parseUnits("10000", 6);
const circleAddress = "0x55fe002aeff02f77364de339a1292923a15844b8";

function getFloatFromBigNum (bigNumValue, dec = 18) {
    return parseFloat(formatUnits(bigNumValue, dec));
}

describe("PoolMamanger test suit", async function () {
    let contractUSDC: Contract;
    let contractlvUSD3CRVPool: Contract;
    let r: ContractTestContext;

    before(async () => {
        r = await buildContractTestContext();
        contractlvUSD3CRVPool = r.curveLvUSDPool; // await ethers.getContractAt(abilvUSD3CRVPool, address3CRVlvUSDPool);

        await r.lvUSD.setMintDestination(r.coordinator.address);
        // mint a bit lvUSD
        await r.lvUSD.mint(twentyK18Decimal);

        // grab some USDC - addr1 is Circle's so it has a lot of USDC need to verify though
        contractUSDC = await ethers.getContractAt(abiUSDC, addressUSDC);
        // expect(await contractUSDC.balanceOf(addr1)).to.be.gte(tenK6Decimal);

        /// transfer USDC to circle to owner
        const signerAddr1 = await impersonateAccount(circleAddress);
        await fundAccount(circleAddress, About4700);
        await contractUSDC.connect(signerAddr1).transfer(r.owner.address, tenK6Decimal);

        // approve Zap contract to grab lvUSD and USDC from addr1
        await r.lvUSD.approve(addressZap, tenK18Decimal);
        await contractUSDC.approve(addressZap, tenK6Decimal);

        // test with 3CRV -- might remove
        await r.external3CRV.approve(r.poolManager.address, tenK18Decimal);
        await r.external3CRV.approve(addressZap, tenK18Decimal);

        await r.lvUSD.approve(r.poolManager.address, tenK18Decimal);
        await contractUSDC.approve(r.poolManager.address, tenK6Decimal);

        // // grab the "before" balances so we can check they increase after adding liquidity
        // const balancePoolLvUSD = await contractlvUSD3CRVPool.balances(0);
        // const balancePoolUSDC = await contractlvUSD3CRVPool.balances(1);

        // // Seed 3CRV/lvUSD pool via Zap
        // const zap = await ethers.getContractAt(abiZap, addressZap);
        // // Indexes: [lvUSD, DAI, USDC, USDT] - represent the amount of token added to pool
        // // Below we seed pool with 100 lvUSD and 100 USDC (and 0 USDT + 0 DAI)
        // const coins = [ethers.utils.parseUnits("100", 18), "0x0", ethers.utils.parseUnits("100", 6), "0x0"];
        // await zap.connect(signerAddr1).add_liquidity(address3CRVlvUSDPool, coins, 0);

        // expect(await contractlvUSD3CRVPool.balances(0)).to.be.gt(balancePoolLvUSD);
        // expect(await contractlvUSD3CRVPool.balances(1)).to.be.gt(balancePoolUSDC);
    });

    it("Should have enough funds in account and coordinator", async function () {
        console.log("Owner USDC/3CRV balance in 6dec : %d, coordinator's lvUSD in 18Dec : %s",
            // getFloatFromBigNum(await contractUSDC.balanceOf(r.owner.address), 6),
            getFloatFromBigNum(await r.external3CRV.balanceOf(r.owner.address), 18),

            getFloatFromBigNum(await r.lvUSD.balanceOf(r.coordinator.address)));
        expect(await contractUSDC.balanceOf(r.owner.address)).to.be.closeTo(tenK6Decimal, 100);
        expect(await r.lvUSD.balanceOf(r.coordinator.address)).to.be.closeTo(twentyK18Decimal, 10000000);
    });

    // it("Should fund pool via JS", async function () {
    //     const hundred = parseUnits("100", 18);
    //     await r.external3CRV.approve(r.curveLvUSDPool.address, hundred);
    //     await r.lvUSD.approve(r.curveLvUSDPool.address, hundred);
    //     await r.curveLvUSDPool.add_liquidity([hundred, hundred], parseUnits("10", 18), r.owner.address);
    //     console.log("JS fund Pool: Balance of Pool: 0 - %s , 1 - %s",
    //         getFloatFromBigNum(await r.curveLvUSDPool.balances(0)),
    //         getFloatFromBigNum(await r.curveLvUSDPool.balances(1)));
    // });

    it("Should fund pool with both lvUSD and USDC", async function () {
        const hundred = parseUnits("100", 18);
        console.log("JS before funding pool : Balance of Pool: 0 - %s , 1 - %s",
            getFloatFromBigNum(await r.curveLvUSDPool.balances(0)),
            getFloatFromBigNum(await r.curveLvUSDPool.balances(1)));
        /// Manually move funds to pool manager
        // await r.lvUSD.approve(r.coordinator.address, hundred);
        // await r.external3CRV.approve(r.owner.address, r.poolManager.address, hundred);

        // await r.lvUSD.setMintDestination(r.owner.address);
        // // mint a bit lvUSD
        // await r.lvUSD.mint(twentyK18Decimal);
        // // await r.lvUSD.transferFrom(r.coordinator.address, r.poolManager.address, hundred);
        // console.log("JS: transfering lvUSD to Manager", r.curveLvUSDPool.address);

        // await r.lvUSD.transfer(r.poolManager.address, hundred);
        // console.log("JS: transferDone", r.curveLvUSDPool.address);

        // await r.external3CRV.transfer(r.poolManager.address, hundred);
        // await r.curveLvUSDPool.approve(r.poolManager.address, parseUnits("10000", 18));

        console.log("Approving pool %s with access to tokens", r.curveLvUSDPool.address);
        // await r.external3CRV.approve(r.curveLvUSDPool.address, hundred);
        // await r.lvUSD.approve(r.curveLvUSDPool.address, hundred);

        await r.poolManager.fundPoolWithUSDC(r.owner.address, parseUnits("90", 18));
        console.log("Balance of Pool: 0 - %s", getFloatFromBigNum(await r.curveLvUSDPool.balances(0)));
        console.log("Balance of Pool: 1 - %s", getFloatFromBigNum(await r.curveLvUSDPool.balances(1)));
    });
});
