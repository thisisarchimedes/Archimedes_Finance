import { assert, expect } from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import {
    addressOUSD,
    abiOUSDToken,
    addressUSDT,
    abiUSDTToken,
    address3CRV,
    abi3CRVToken,
    abiWETH9Token,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV,
    helperSwapETHWithOUSD,
    helperSwapETHWithUSDT,
    helperResetNetwork,
    defaultBlockNumber,
    addressWETH9,
    helperSwapETHWithOUSD,
} from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext, setRolesForEndToEnd, startAuctionAcceptLeverageAndEndAuction } from "./ContractTestContext";
import { formatUnits, zeroPad } from "ethers/lib/utils";
import { logger } from "../logger";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
const usdtToDeposit: BigNumber = bnFromNum(100);
const minLiq = bnFromNum(100);
let exchangeAmount = 10000000; // this is 10 in 6Decimal
const cycles = 5;
const positionId = 0;

let r: ContractTestContext;
let owner: SignerWithAddress;
let user: SignerWithAddress;
let externalOUSD: Contract;
let externalUSDT: Contract;
let external3CRV: Contract;
let externalWETH: Contract;

function bnFromNum (num: number, decimal = 18): BigNumber {
    return ethers.utils.parseUnits(num.toString(), decimal);
}

function bnFromStr (num: string, decimal = 18): BigNumber {
    return ethers.utils.parseUnits(num.toString(), decimal);
}

function numFromBn (num: BigNumber, decimals = 18): number {
    return Number(ethers.utils.formatUnits(num, decimals));
}

async function getUserSomeWETH (r: ContractTestContext) {
    externalWETH = new ethers.Contract(addressWETH9, abiWETH9Token, owner);
    await ethers.provider.send("evm_mine");
    let weth9Balance = await externalWETH.balanceOf(owner.address);
    await externalWETH.deposit({ value: bnFromNum(1) });
    weth9Balance = await externalWETH.balanceOf(owner.address);
    // console.log("weth9Balance: %s", numFromBn(weth9Balance));
}
async function createPair (r: ContractTestContext): Contract {
    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const uniswapFactory = new ethers.Contract(factoryAddress, factoryABI, owner);
    const tx = await uniswapFactory.createPair(r.archToken.address, addressWETH9);
    const receipt = await tx.wait();
    const pairCreatedEvent = receipt.events?.filter((x) => { return x.event === "PairCreated"; });
    const pairAddress = pairCreatedEvent[0].args.pair;
    const pairToken = new ethers.Contract(pairAddress, pairABI, owner);
    return pairToken;
}
async function getRouter (r: ContractTestContext): Contract {
    const routeToken = new ethers.Contract(routeAddress, routerABI, owner);
    return routeToken;
}
async function addLiquidityToPairViaRouter (r: ContractTestContext, pairToken: Contract) {
    await r.archToken.connect(r.treasurySigner).transfer(owner.address, minLiq);

    const routeInstance = await getRouter(r);

    await r.archToken.approve(routeAddress, minLiq);

    await routeInstance.addLiquidityETH(
        r.archToken.address,
        minLiq,
        bnFromNum(100),
        bnFromNum(0.001),
        owner.address,
        1670978314,
        { value: bnFromNum(0.04) }, // The amount in Eth to send to pair, long calc but it is worth 100
    );
    await ethers.provider.send("evm_mine");

    const reserves = await pairToken.getReserves();
    // console.log("reserves0, r1 : %s %s ", numFromBn(reserves._reserve0), numFromBn(reserves._reserve1))
}

async function createUniswapPool (r: ContractTestContext) {
    await getUserSomeWETH(r);
    const pairToken = await createPair(r);

    await addLiquidityToPairViaRouter(r, pairToken);

    await ethers.provider.send("evm_mine");
}

async function getUSDCToUser (r: ContractTestContext) {
    const router = await getRouter(r);
    /// Using USDT abi for USDC as its the same (erc20)
    const tokenUSDC = new ethers.Contract(usdcAddress, abiUSDTToken, owner);
    await router.swapExactETHForTokens(bnFromNum(500, 6), [addressWETH9, usdcAddress], owner.address, 1670978314, { value: bnFromNum(1) });
}

async function getDAIToUser (r: ContractTestContext) {
    // Notice dai is 18 decimal
    const router = await getRouter(r);
    /// Using USDT abi for USDC as its the same (erc20)
    const tokenDAI = new ethers.Contract(daiAddress, abiUSDTToken, owner);
    await router.swapExactETHForTokens(bnFromNum(500, 18), [addressWETH9, daiAddress], owner.address, 1670978314, { value: bnFromNum(1) });
}
async function setupFixture () {
    // build mainnet fork and deploy archimedes
    r = await buildContractTestContext();
    owner = r.owner;
    user = r.addr1;

    // Add zapper. Need to be move into buildContractTestContext once done.
    const zapperFactory = await ethers.getContractFactory("Zapper");
    const zapper = await hre.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
    await zapper.setDependencies(addressOUSD, address3CRV,
        addressUSDT, addressCurveOUSDPool, routeAddress,
        r.leverageEngine.address, r.archToken.address, r.parameterStore.address);

    /// transfer some Arch to Zapper for testing
    ///  Remove this as we dont want zapper to have extra Arch
    // await r.archToken.connect(r.treasurySigner).transfer(zapper.address, bnFromNum(100))

    // fund some LvUSD + setup for being able to create positions
    await r.lvUSD.setMintDestination(r.coordinator.address);
    await r.lvUSD.mint(bnFromNum(10000));

    // await r.coordinator.acceptLeverageAmount(bnFromNum(10000));
    await startAuctionAcceptLeverageAndEndAuction(r, bnFromNum(10000), 5, bnFromNum(9), bnFromNum(10));
    await setRolesForEndToEnd(r);

    // Create pool and get user some USDT [TODO: Add more tokens]
    await createUniswapPool(r);
    await helperSwapETHWithUSDT(owner, bnFromNum(1));
    const usdtBalance = await r.externalUSDT.balanceOf(owner.address);
    console.log("Balance of USDT for owner is " + usdtBalance);

    // Approve USDT to zapper (users would do it via UI in real app)
    // await r.externalUSDT.approve(zapper.address, usdtBalance);

    /// Get user some arch

    console.log("END Setting up");

    return { r, zapper };
}

async function zapIntoPosition (
    r: ContractTestContext,
    zapper: ContractTestContext, useUserArch = false) {
    const baseAddress = addressUSDT;
    await r.externalUSDT.approve(zapper.address, exchangeAmount);
    await zapper.zapIn(exchangeAmount, cycles, 990, baseAddress, useUserArch);
}

async function zapOutPositionWithAnyBase (
    r: ContractTestContext,
    zapper: ContractTestContext, baseToken: Contract, useUserArch = false) {
    console.log("Zapping out with base token address " + baseToken.address);
    await baseToken.approve(zapper.address, exchangeAmount);
    await zapper.zapIn(exchangeAmount, cycles, 990, baseToken.address, useUserArch);
}

async function printPositionInfo (r: ContractTestContext, positionId = 0) {
    const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
    const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(positionId));

    console.log(positionId + " position has " + collateral + " OUSD");
    console.log(positionId + " position has " + leverage + " lvUSD");
}

async function getArchPriceInDollars (
    r: ContractTestContext,
    zapper: ContractTestContext,
    dollarAmountForEstimate = 100): number {
    const uniswapRouter = await getRouter(r);
    const amountsReturned = await uniswapRouter.getAmountsOut(
        ethers.utils.parseUnits(dollarAmountForEstimate.toString(), 6),
        [addressUSDT, addressWETH9, r.archToken.address]);
    const numberOfArchTokensReturned = numFromBn(amountsReturned[2], 18);
    const archPrice = dollarAmountForEstimate / numberOfArchTokensReturned;
    return archPrice;
}

describe("Zapper test suite", function () {
    describe("non USDT Zapper test", function () {
        it("Should create position with USDC", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            await getUSDCToUser(r);
            const tokenUSDC = new ethers.Contract(usdcAddress, abiUSDTToken, owner);
            const usdcBalance = await tokenUSDC.balanceOf(owner.address);

            await zapOutPositionWithAnyBase(r, zapper, tokenUSDC);
            await printPositionInfo(r);

            const usdcBalanceAfter = await tokenUSDC.balanceOf(owner.address);

            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            expect(usdcBalanceAfter).to.be.closeTo(usdcBalance.sub(exchangeAmount), 1);
        });

        it("Should create position with DAI", async function () {
            /// Most of the tests assume base stable is 6 decimals but DAI is 18 decimals. So change it just for this test!
            exchangeAmount = bnFromNum(10);
            const { r, zapper } = await loadFixture(setupFixture);
            await getDAIToUser(r);

            const tokenDAI = new ethers.Contract(daiAddress, abiUSDTToken, owner);

            const daiBalance = await tokenDAI.balanceOf(owner.address);

            await zapOutPositionWithAnyBase(r, zapper, tokenDAI);
            await printPositionInfo(r);

            const daiBalanceAfter = await tokenDAI.balanceOf(owner.address);

            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            expect(daiBalanceAfter).to.be.closeTo(daiBalance.sub(exchangeAmount), 1);

            exchangeAmount = bnFromNum(10, 6);
        });
    });

    describe("Basic Zapper test", function () {
        it("Should add CDP values to zapped in position", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            await zapIntoPosition(r, zapper);

            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(positionId));

            // console.log(positionId + " position has " + collateral + " OUSD");
            // console.log(positionId + " position has " + leverage + " lvUSD");

            expect(collateral).to.be.closeTo(8, 1);
            expect(leverage).to.be.closeTo(34, 2);
        });

        it("Should be able to create positions using user owned Arch token", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            await r.archToken.connect(r.treasurySigner).transfer(owner.address, bnFromNum(5));
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(5));
            await zapIntoPosition(r, zapper, true);
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
        });

        it("Should be able to open multiple positions", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            await r.archToken.connect(r.treasurySigner).transfer(owner.address, bnFromNum(10));

            await zapIntoPosition(r, zapper);
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(5));
            await zapIntoPosition(r, zapper, true);
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(0));

            await zapIntoPosition(r, zapper);
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(5));
            await zapIntoPosition(r, zapper, true);
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(0));

            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            expect(await r.positionToken.ownerOf(1)).to.equal(owner.address);
            expect(await r.positionToken.ownerOf(2)).to.equal(owner.address);
            expect(await r.positionToken.ownerOf(3)).to.equal(owner.address);

            const collateral0 = numFromBn(await r.cdp.getOUSDPrinciple(0));
            const collateral1 = numFromBn(await r.cdp.getOUSDPrinciple(1));
            const collateral2 = numFromBn(await r.cdp.getOUSDPrinciple(2));
            const collateral3 = numFromBn(await r.cdp.getOUSDPrinciple(3));

            expect(collateral0).to.be.closeTo(8, 1);
            expect(collateral1).to.be.closeTo(10, 1);
            expect(collateral2).to.be.closeTo(8, 1);
            expect(collateral3).to.be.closeTo(10, 1);
        });
    });

    describe("Zapper Preview methods", function () {
        const amountInBase = 10;
        it("should preview split tokens correctly", async function () {
            /// baseAmount = collateral + dollarsToPayForArch
            /// dollarsToPayForArch = (leverageAmount(collateral) * archPrice(unknown)) / archToLevRatio

            ///  archPrice -> we estimate from pool. First getting price for 1 arch token, then for the correct amount we need
            ///  leverageAmount = f(collateral) = getAllowedLeverageForPosition(collateral, cycles)
            /// after first run with baseAmount = 1, we get some reasonable ratio between collateral and dollarsToPayForArch
            /// then we can use this ratio to calculate dollarsToPayForArch + collateral for any baseAmount

            const { r, zapper } = await loadFixture(setupFixture);
            const archPrice = await getArchPriceInDollars(r, zapper, amountInBase);
            const split = await zapper.previewTokenSplit(bnFromNum(amountInBase, 6), cycles, addressUSDT);

            const collateral = numFromBn(split[0], 6);
            const dollarsToPayForArch = numFromBn(split[1], 6);
            const leverageAmount = numFromBn(
                await r.parameterStore.getAllowedLeverageForPosition(
                    ethers.utils.parseUnits(collateral.toString()),
                    cycles),
            );
            const archToLevRatio = numFromBn(await r.parameterStore.getArchToLevRatio());
            console.log("[0]:Collateral %s [1]:DollarsToPayForArch %s", collateral, dollarsToPayForArch);
            console.log("leveraged amount: %s, archToLevRation %s", leverageAmount, archToLevRatio);
            console.log("archPrice of 1arch=" + archPrice + "$ when using " + amountInBase + " as base");
            const dollarsToPayForCollCalc = amountInBase - (leverageAmount * archPrice) / archToLevRatio;
            const dollarsToPayForArchCalc = amountInBase - dollarsToPayForCollCalc;
            console.log("JS calculation collateral %s dollarForArch %s",
                dollarsToPayForCollCalc, dollarsToPayForArchCalc);
            expect(dollarsToPayForCollCalc).to.be.closeTo(collateral, 0.5);
            expect(dollarsToPayForArchCalc).to.be.closeTo(dollarsToPayForArch, 0.5);
        });

        it("should previewAmounts correctly when zapping both arch and OUSD", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            const exchangeAmount = bnFromNum(amountInBase, 6);
            let [collateralAmount, archAmount] =
                await zapper.previewZapInAmount(exchangeAmount, cycles, 990, addressUSDT, false);
            collateralAmount = numFromBn(collateralAmount);
            archAmount = numFromBn(archAmount);
            // console.log("PREVIEW arch amount %s ,collateralAmount %s", archAmount, collateralAmount)
            expect(collateralAmount).to.be.closeTo(8.1, 0.5);
            expect(archAmount).to.be.closeTo(3.6, 0.5);
        });

        it("should previewAmounts correctly when zapping just OUSD and using arch from users wallet",
            async function () {
                const { r, zapper } = await loadFixture(setupFixture);
                const exchangeAmount = bnFromNum(amountInBase, 6);
                let [collateralAmount, archAmount] = await zapper.previewZapInAmount(exchangeAmount, cycles, 990, addressUSDT, true);
                collateralAmount = numFromBn(collateralAmount);
                archAmount = numFromBn(archAmount);
                console.log("PREVIEW2 arch amount %s ,collateralAmount %s", archAmount, collateralAmount);
                expect(collateralAmount).to.be.closeTo(10, 0.5);
                // Notice we need more Arch tokens in compared to test above because collateral is higher
                expect(archAmount).to.be.closeTo(4.3, 0.5);
            });
    });

    describe("open big position", function () {
        it("Should be able to open a position with 200 lvUSD", async function () {
            const bigExchangeAmount = 200;
            const bigExchangeAmountInBase = bnFromNum(bigExchangeAmount, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            const usdtBalance = numFromBn(await r.externalUSDT.balanceOf(owner.address), 6);
            expect(usdtBalance).to.be.greaterThan(bigExchangeAmount);
            await r.externalUSDT.approve(zapper.address, bigExchangeAmountInBase);
            await zapper.zapIn(bigExchangeAmountInBase, cycles, 990, addressUSDT, false);
            await printPositionInfo(r, 0);
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
        });
    });
});
/* eslint-disable max-len */
const factoryABI = [{ inputs: [{ internalType: "address", name: "_feeToSetter", type: "address" }], payable: false, stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "token0", type: "address" }, { indexed: true, internalType: "address", name: "token1", type: "address" }, { indexed: false, internalType: "address", name: "pair", type: "address" }, { indexed: false, internalType: "uint256", name: "", type: "uint256" }], name: "PairCreated", type: "event" }, { constant: true, inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "allPairs", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "allPairsLength", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }], name: "createPair", outputs: [{ internalType: "address", name: "pair", type: "address" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "feeTo", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "feeToSetter", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "address", name: "", type: "address" }], name: "getPair", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_feeTo", type: "address" }], name: "setFeeTo", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_feeToSetter", type: "address" }], name: "setFeeToSetter", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }];
const routerABI = [{ inputs: [{ internalType: "address", name: "_factory", type: "address" }, { internalType: "address", name: "_WETH", type: "address" }], stateMutability: "nonpayable", type: "constructor" }, { inputs: [], name: "WETH", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }, { internalType: "uint256", name: "amountADesired", type: "uint256" }, { internalType: "uint256", name: "amountBDesired", type: "uint256" }, { internalType: "uint256", name: "amountAMin", type: "uint256" }, { internalType: "uint256", name: "amountBMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "addLiquidity", outputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "amountB", type: "uint256" }, { internalType: "uint256", name: "liquidity", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "amountTokenDesired", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "addLiquidityETH", outputs: [{ internalType: "uint256", name: "amountToken", type: "uint256" }, { internalType: "uint256", name: "amountETH", type: "uint256" }, { internalType: "uint256", name: "liquidity", type: "uint256" }], stateMutability: "payable", type: "function" }, { inputs: [], name: "factory", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint256", name: "reserveIn", type: "uint256" }, { internalType: "uint256", name: "reserveOut", type: "uint256" }], name: "getAmountIn", outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }], stateMutability: "pure", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "reserveIn", type: "uint256" }, { internalType: "uint256", name: "reserveOut", type: "uint256" }], name: "getAmountOut", outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }], stateMutability: "pure", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }], name: "getAmountsIn", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }], name: "getAmountsOut", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "reserveA", type: "uint256" }, { internalType: "uint256", name: "reserveB", type: "uint256" }], name: "quote", outputs: [{ internalType: "uint256", name: "amountB", type: "uint256" }], stateMutability: "pure", type: "function" }, { inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountAMin", type: "uint256" }, { internalType: "uint256", name: "amountBMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "removeLiquidity", outputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "amountB", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "removeLiquidityETH", outputs: [{ internalType: "uint256", name: "amountToken", type: "uint256" }, { internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "removeLiquidityETHSupportingFeeOnTransferTokens", outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "bool", name: "approveMax", type: "bool" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "removeLiquidityETHWithPermit", outputs: [{ internalType: "uint256", name: "amountToken", type: "uint256" }, { internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "bool", name: "approveMax", type: "bool" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens", outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountAMin", type: "uint256" }, { internalType: "uint256", name: "amountBMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "bool", name: "approveMax", type: "bool" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "removeLiquidityWithPermit", outputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "amountB", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapETHForExactTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "payable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactETHForTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "payable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactETHForTokensSupportingFeeOnTransferTokens", outputs: [], stateMutability: "payable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForETH", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForETHSupportingFeeOnTransferTokens", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForTokensSupportingFeeOnTransferTokens", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint256", name: "amountInMax", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapTokensForExactETH", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint256", name: "amountInMax", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapTokensForExactTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { stateMutability: "payable", type: "receive" }];
const pairABI = [{ inputs: [], payable: false, stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: true, internalType: "address", name: "spender", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Approval", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: false, internalType: "uint256", name: "amount0", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1", type: "uint256" }, { indexed: true, internalType: "address", name: "to", type: "address" }], name: "Burn", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: false, internalType: "uint256", name: "amount0", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1", type: "uint256" }], name: "Mint", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: false, internalType: "uint256", name: "amount0In", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1In", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount0Out", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1Out", type: "uint256" }, { indexed: true, internalType: "address", name: "to", type: "address" }], name: "Swap", type: "event" }, { anonymous: false, inputs: [{ indexed: false, internalType: "uint112", name: "reserve0", type: "uint112" }, { indexed: false, internalType: "uint112", name: "reserve1", type: "uint112" }], name: "Sync", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "from", type: "address" }, { indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Transfer", type: "event" }, { constant: true, inputs: [], name: "DOMAIN_SEPARATOR", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "MINIMUM_LIQUIDITY", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "PERMIT_TYPEHASH", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "address", name: "", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }], name: "burn", outputs: [{ internalType: "uint256", name: "amount0", type: "uint256" }, { internalType: "uint256", name: "amount1", type: "uint256" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "factory", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "getReserves", outputs: [{ internalType: "uint112", name: "_reserve0", type: "uint112" }, { internalType: "uint112", name: "_reserve1", type: "uint112" }, { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_token0", type: "address" }, { internalType: "address", name: "_token1", type: "address" }], name: "initialize", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "kLast", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }], name: "mint", outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }], name: "nonces", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "permit", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "price0CumulativeLast", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "price1CumulativeLast", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }], name: "skim", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount0Out", type: "uint256" }, { internalType: "uint256", name: "amount1Out", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "bytes", name: "data", type: "bytes" }], name: "swap", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [], name: "sync", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "token0", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "token1", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }], name: "transfer", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }], name: "transferFrom", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }];
