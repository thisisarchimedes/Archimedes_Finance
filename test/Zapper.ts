import { assert, expect } from "chai";
import hre, { ethers } from "hardhat";
import {
    addressOUSD,
    abiOUSDToken,
    addressUSDT,
    abiUSDTToken,
    address3CRV,
    abi3CRVToken,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV,
    helperSwapETHWithUSDT,
    helperResetNetwork,
    defaultBlockNumber,
} from "./MainnetHelper";
import { helperSwapETHWithOUSD } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext, setRolesForEndToEnd } from "./ContractTestContext";
import { formatUnits } from "ethers/lib/utils";
import { logger } from "../logger";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

function bnFromNum(num: number): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function bnFromStr(num: string): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function numFromBn(num: BigNumber): number {
    return Number(ethers.utils.formatUnits(num));
}

describe("Zapper test suite", function () {
    const usdtToDeposit: BigNumber = bnFromNum(100);
    // const endPrice: BigNumber = bnFromNum(300);
    // const length = 10;
    // const lengthBN: BigNumber = BigNumber.from(length);
    // const incrementalPricePerBlock: BigNumber = bnFromNum((300 - 200) / length);
    // let owner;

    let r: ContractTestContext;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let externalOUSD: Contract;
    let externalUSDT: Contract;
    let external3CRV: Contract;

    async function setupFixture() {
        // build mainnet fork and deploy archimedes
        r = await buildContractTestContext();
        owner = r.owner;
        user = r.addr1;
        // [owner, user] = await ethers.getSigners();



        // externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, owner);
        // externalUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, owner);
        // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // // @ts-ignore
        // external3CRV = new ethers.Contract(address3CRV, abi3CRVToken, owner);

        // Add zapper. Need to be move into buildContractTestContext once done.
        const zapperFactory = await ethers.getContractFactory("Zapper");
        const zapper = await hre.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
        await zapper.setDependencies(addressOUSD, address3CRV, addressUSDT, addressCurveOUSDPool, r.leverageEngine.address, r.archToken.address)

        /// transfer some Arch to Zapper for testing
        await r.archToken.connect(r.treasurySigner).transfer(zapper.address, bnFromNum(100))

        // fund some LvUSD + setup for being able to create positions
        await r.lvUSD.setMintDestination(r.coordinator.address);
        await r.lvUSD.mint(bnFromNum(10000));
        await r.coordinator.acceptLeverageAmount(bnFromNum(10000));
        await setRolesForEndToEnd(r);


        // tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, owner);

        const something = await helperSwapETHWithUSDT(owner, bnFromNum(1));
        // await helperSwapETHWith3CRV(owner,bnFromNum(1))
        const usdtBalance = await r.externalUSDT.balanceOf(owner.address)
        // const crvBalance = await r.external3CRV.balanceOf(owner.address)
        console.log("Balance of USDT for owner is " + usdtBalance)
        // console.log("Balance of 3crv for owner is " + crvBalance)

        await r.externalUSDT.approve(addressCurveOUSDPool, usdtBalance);
        await r.externalUSDT.approve(zapper.address, usdtBalance);

        // await r.external3CRV.approve(addressCurveOUSDPool, crvBalance);
        // await r.external3CRV.approve(zapper.address, crvBalance);

        /// Get user some arch 
        return zapper;
    }

    describe("Basic Zapper test", function () {
        // it("user should have some USDT", async function () { 
        //     const zapper = await loadFixture(setupFixture);
        //     const usdtBalance = await tokenUSDT.balanceOf(owner.address)
        //     /// Notice that USDT is 6 decimal
        //     expect(usdtBalance).to.gt(ethers.utils.parseUnits("100", 6));
        // });

        // it("Should be able to previewZap", async function () {
        //     const zapper = await loadFixture(setupFixture);
        //     const usdtBalance = await r.external3CRV.balanceOf(owner.address)
        //     console.log("in preview usdtBalance is " + usdtBalance)
        //     await zapper.previewZapIn(3000000, 3000000, 0);
        //     // expect(tokenId).to.equal(1);
        // });

        it("Should be able to Zap", async function () {
            const zapper = await loadFixture(setupFixture);
            const exchangeAmount = 10000000;  // this is 10 in 6Decimal

            // console.log("OUSD balance before "  + numFromBn(userOUSDBalanceBefore));
            // const usdtBalance = await r.externalUSDT.balanceOf(owner.address)

            // const allownaceOfPool = await r.externalUSDT.allowance(owner.address,addressCurveOUSDPool);
            // console.log("inTest:usdtBalance sent is " + usdtBalance + " allownce is " + allownaceOfPool);
            // const exchangeAmount = 10000000;

            /// transfer funds to Zapper. Curve API require funds be on who ever calls it.
            await r.externalUSDT.transfer(zapper.address, exchangeAmount)
            await zapper.zapIn(exchangeAmount, bnFromNum(1), 5, 3);

            const zapperOUSDBalanceAfter = await r.externalOUSD.balanceOf(zapper.address)
            expect(numFromBn(zapperOUSDBalanceAfter)).to.be.closeTo(10, 0.1);
        });



    });

}); 