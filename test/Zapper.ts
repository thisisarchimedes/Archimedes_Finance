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
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { formatUnits } from "ethers/lib/utils";
import { logger } from "../logger";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

function bnFromNum (num:number): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function bnFromStr (num:string): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function numFromBn (num:BigNumber) : number {
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
    let tokenUSDT : Contract;

    async function setupFixture () {
        // build mainnet fork and deploy archimedes
        r = await buildContractTestContext();
        owner = r.owner;
        user = r.addr1;

        // Add zapper. Need to be move into buildContractTestContext once done.
        const zapperFactory = await ethers.getContractFactory("Zapper");
        const zapper = await hre.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
        await zapper.setDependencies(addressOUSD, address3CRV, addressCurveOUSDPool)

        tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, owner);

        const balanceUSDT = await helperSwapETHWithUSDT(owner,bnFromNum(1));
        const usdtBalance = await tokenUSDT.balanceOf(owner.address)
        await tokenUSDT.approve(addressCurveOUSDPool, usdtBalance);
        await tokenUSDT.approve(zapper.address, usdtBalance);

        /// Get user some arch 
        return zapper;
    }

    describe("Basic Zapper test" ,function () {
        it("user should have some USDT", async function () { 
            const zapper = await loadFixture(setupFixture);
            const usdtBalance = await tokenUSDT.balanceOf(owner.address)
            /// Notice that USDT is 6 decimal
            expect(usdtBalance).to.gt(ethers.utils.parseUnits("100", 6));
        });

        it("Should be able to previewZap", async function () {
            const zapper = await loadFixture(setupFixture);
            const usdtBalance = await tokenUSDT.balanceOf(owner.address)
            await zapper.previewZapIn(usdtBalance, usdtBalance, 0);
            // expect(tokenId).to.equal(1);
        });

        it("Should be able to Zap", async function () {
            const zapper = await loadFixture(setupFixture);
            const userOUSDBalanceBefore = await r.externalOUSD.balanceOf(owner.address)
            console.log("OUSD balance before "  + numFromBn(userOUSDBalanceBefore));
            const usdtBalance = await tokenUSDT.balanceOf(owner.address)
            await zapper.zapIn(usdtToDeposit, usdtToDeposit, 0);
            const userOUSDBalanceAfter = await r.externalOUSD.balanceOf(owner.address)
            console.log("OUSD balance after " + numFromBn(userOUSDBalanceAfter));

        });



    });

}); 