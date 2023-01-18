"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// We import Chai to use its asserting functions here.
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ABIs_1 = require("../test/ABIs");
const MainnetHelper_1 = require("../test/MainnetHelper");
const IntegrationTestContext_1 = require("./IntegrationTestContext");
const About4700 = "0x1000000000000000000";
const tenK18Decimal = hardhat_1.ethers.utils.parseUnits("10000", 18);
const tenK6Decimal = hardhat_1.ethers.utils.parseUnits("10000", 6);
const addr1 = "0x55fe002aeff02f77364de339a1292923a15844b8"; // Circle's address
const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";
let contractlvUSDToken;
let contractUSDC;
let contractlvUSD3CRVPool;
let signerlvUSDAdmin;
let signerlvUSDMinter;
let signerAddr1;
describe("3CRV/lvUSD curve pool test suit", function () {
    before(async function () {
        await (0, MainnetHelper_1.helperResetNetwork)(MainnetHelper_1.defaultBlockNumber);
        // grab lvUSD token contract
        contractlvUSDToken = await hardhat_1.ethers.getContractAt(ABIs_1.abilvUSD, IntegrationTestContext_1.addresslvUSDToken);
        // grab lvUSD admin address
        signerlvUSDAdmin = await (0, IntegrationTestContext_1.impersonateAccount)(addresslvUSDAdmin);
        (0, IntegrationTestContext_1.fundAccount)(addresslvUSDAdmin, About4700);
        // grab lvUSD minter address
        signerlvUSDMinter = await (0, IntegrationTestContext_1.impersonateAccount)(addresslvUSDMinter);
        (0, IntegrationTestContext_1.fundAccount)(addresslvUSDMinter, About4700);
        // grab random test address
        signerAddr1 = await (0, IntegrationTestContext_1.impersonateAccount)(addr1);
        (0, IntegrationTestContext_1.fundAccount)(addr1, About4700);
        // get 3CRV/lvUSD contract
        contractlvUSD3CRVPool = await hardhat_1.ethers.getContractAt(ABIs_1.abilvUSD3CRVPool, MainnetHelper_1.address3CRVlvUSDPool);
    });
    after(async function () {
        await (0, IntegrationTestContext_1.stopImpersonate)(addresslvUSDMinter);
        await (0, IntegrationTestContext_1.stopImpersonate)(addresslvUSDAdmin);
        await (0, IntegrationTestContext_1.stopImpersonate)(addr1);
    });
    it("Add liquidity to 3CRV/lvUSD pool", async function () {
        // set lvUSD mint address
        await contractlvUSDToken.connect(signerlvUSDAdmin).setMintDestination(addr1);
        // mint a bit lvUSD
        await contractlvUSDToken.connect(signerlvUSDMinter).mint(tenK18Decimal);
        // grab some USDC - addr1 is Circle's so it has a lot of USDC need to verify though
        contractUSDC = await hardhat_1.ethers.getContractAt(ABIs_1.abiUSDC, MainnetHelper_1.addressUSDC);
        (0, chai_1.expect)(await contractUSDC.balanceOf(addr1)).to.be.gte(tenK6Decimal);
        // approve Zap contract to grab lvUSD and USDC from addr1
        await contractlvUSDToken.connect(signerAddr1).approve(MainnetHelper_1.addressZap, tenK18Decimal);
        await contractUSDC.connect(signerAddr1).approve(MainnetHelper_1.addressZap, tenK6Decimal);
        // grab the "before" balances so we can check they increase after adding liquidity
        const balancePoolLvUSD = await contractlvUSD3CRVPool.balances(0);
        const balancePoolUSDC = await contractlvUSD3CRVPool.balances(1);
        // Seed 3CRV/lvUSD pool via Zap
        const zap = await hardhat_1.ethers.getContractAt(ABIs_1.abiZap, MainnetHelper_1.addressZap);
        // Indexes: [lvUSD, DAI, USDC, USDT] - represent the amount of token added to pool
        // Below we seed pool with 100 lvUSD and 100 USDC (and 0 USDT + 0 DAI)
        const coins = [hardhat_1.ethers.utils.parseUnits("100", 18), "0x0", hardhat_1.ethers.utils.parseUnits("100", 6), "0x0"];
        await zap.connect(signerAddr1).add_liquidity(MainnetHelper_1.address3CRVlvUSDPool, coins, 0);
        (0, chai_1.expect)(await contractlvUSD3CRVPool.balances(0)).to.be.gt(balancePoolLvUSD);
        (0, chai_1.expect)(await contractlvUSD3CRVPool.balances(1)).to.be.gt(balancePoolUSDC);
    });
    it("Swap lvUSD with USDT", async function () {
        // connect to USDT contract
        const contractUSDT = await hardhat_1.ethers.getContractAt(ABIs_1.abiUSDTToken, MainnetHelper_1.addressUSDT);
        // approve 3CRV/lvUSD contract to grab lvUSDC from addr1
        await contractlvUSDToken.connect(signerAddr1).approve(MainnetHelper_1.address3CRVlvUSDPool, tenK18Decimal);
        // record pre-swap lvUSD and USDT balances on addr1
        const balanceLvUSDPre = Number(hardhat_1.ethers.utils.formatUnits(await contractlvUSDToken.balanceOf(addr1), 18));
        const balanceUSDTPre = Number(hardhat_1.ethers.utils.formatUnits(await contractUSDT.balanceOf(addr1), 6));
        // swap lvUSD->USDT
        // 0 = lvUSD index ; 3 = USDT index
        await contractlvUSD3CRVPool.connect(signerAddr1).exchange_underlying(0, 3, hardhat_1.ethers.utils.parseUnits("1", 18), 0);
        // record post-swap lvUSD and USDT balances on addr1
        const balanceLvUSDPost = Number(hardhat_1.ethers.utils.formatUnits(await contractlvUSDToken.balanceOf(addr1), 18));
        const balanceUSDTPost = Number(hardhat_1.ethers.utils.formatUnits(await contractUSDT.balanceOf(addr1), 6));
        // if exchangeRate = 1 it means 1:1 rate with no fees. we expect somewhere between 0.998 <-> 1.002
        const exchangeRate = (balanceLvUSDPre - balanceLvUSDPost) / (balanceUSDTPost - balanceUSDTPre);
        (0, chai_1.expect)(exchangeRate).to.be.closeTo(1, 0.005);
        // make sure we have less lvUSD after the swap
        (0, chai_1.expect)(balanceLvUSDPost).to.lt(balanceLvUSDPre);
        // make sure we have more USDC after the swap
        (0, chai_1.expect)(balanceUSDTPost).to.gt(balanceUSDTPre);
    });
    it("Swap USDC with lvUSD", async function () {
        // approve 3CRV/lvUSD contract to grab USDC from addr1
        await contractUSDC.connect(signerAddr1).approve(MainnetHelper_1.address3CRVlvUSDPool, tenK18Decimal);
        // record pre-swap lvUSD and USDT balances on addr1
        const balanceLvUSDPre = Number(hardhat_1.ethers.utils.formatUnits(await contractlvUSDToken.balanceOf(addr1), 18));
        const balanceUSDCPre = Number(hardhat_1.ethers.utils.formatUnits(await contractUSDC.balanceOf(addr1), 6));
        // swap USDC->lvUSD
        // 0 = lvUSD index ; 2 = USDC index
        await contractlvUSD3CRVPool.connect(signerAddr1).exchange_underlying(2, 0, hardhat_1.ethers.utils.parseUnits("1", 6), 0);
        // record post-swap lvUSD and USDT balances on addr1
        const balanceLvUSDPost = Number(hardhat_1.ethers.utils.formatUnits(await contractlvUSDToken.balanceOf(addr1), 18));
        const balanceUSDCPost = Number(hardhat_1.ethers.utils.formatUnits(await contractUSDC.balanceOf(addr1), 6));
        // if exchangeRate = 1 it means 1:1 rate with no fees. we expect somewhere between 0.998 <-> 1.002
        const exchangeRate = (balanceLvUSDPre - balanceLvUSDPost) / (balanceUSDCPost - balanceUSDCPre);
        (0, chai_1.expect)(exchangeRate).to.be.closeTo(1, 0.005);
        // make sure we have more lvUSD after the swap
        (0, chai_1.expect)(balanceLvUSDPost).to.gt(balanceLvUSDPre);
        // make sure we have less USDC after the swap
        (0, chai_1.expect)(balanceUSDCPost).to.lt(balanceUSDCPre);
        /* // keep for debuging
        console.log("pre lvUSD: " + balanceLvUSDPre);
        console.log("pre USDC: " + balanceUSDCPre);
        console.log("post lvUSD: " + balanceLvUSDPost);
        console.log("post USDC: " + balanceUSDCPost);
        console.log("Exchange Rate: " + exchangeRate);
        */
    });
});
