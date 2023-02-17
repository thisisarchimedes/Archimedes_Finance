import { assert, expect } from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import {
    addressUSDT,
    abiUSDTToken,
    abiWETH9Token,
    helperSwapETHWithUSDT,
    addressWETH9,
    bnFromStr,
    addressUSDC,
} from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext, setRolesForEndToEnd, startAuctionAcceptLeverageAndEndAuction } from "./ContractTestContext";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
const exchangeAmount = 10000000; // this is 10 in 6Decimal
const defaultCycles = 5;
const positionId = 0;
const archMinLiq = bnFromNum(99000);
const archTotalLiq = bnFromNum(100000);
const usdcTotalLiq = bnFromNum(50000, 6);
const usdcMinLiq = bnFromNum(49000, 6);
const ethTotalLiq = bnFromNum(40);

let r: ContractTestContext;
let owner: SignerWithAddress;
let user: SignerWithAddress;
let externalOUSD: Contract;
let externalUSDT: Contract;
let external3CRV: Contract;
let externalWETH: Contract;

function bnFromNum(num: number, decimal = 18): BigNumber {
    return ethers.utils.parseUnits(num.toString(), decimal);
}

function numFromBn(num: BigNumber, decimals = 18): number {
    return Number(ethers.utils.formatUnits(num, decimals));
}

// Rounds number to the max amount of decimal places allowed for BN (18 decimals)
function round(num: number): number {
    return Math.round((num + Number.EPSILON) * 1000000000000000000) / 1000000000000000000;
}

async function getUserSomeWETH(r: ContractTestContext) {
    externalWETH = new ethers.Contract(addressWETH9, abiWETH9Token, owner);
    await ethers.provider.send("evm_mine");
    let weth9Balance = await externalWETH.balanceOf(owner.address);
    await externalWETH.deposit({ value: bnFromNum(1) });
    weth9Balance = await externalWETH.balanceOf(owner.address);
}
async function createPair(r: ContractTestContext): Promise<Contract> {
    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const uniswapFactory = new ethers.Contract(factoryAddress, factoryABI, owner);
    const tx = await uniswapFactory.createPair(r.archToken.address, addressUSDC);
    const receipt = await tx.wait();
    const pairCreatedEvent = receipt.events?.filter((x) => { return x.event === "PairCreated"; });
    const pairAddress = pairCreatedEvent[0].args.pair;
    const pairToken = new ethers.Contract(pairAddress, pairABI, owner);
    return pairToken;
}
async function getRouter(r: ContractTestContext): Promise<Contract> {
    const routeToken = new ethers.Contract(routeAddress, routerABI, owner);
    return routeToken;
}
async function addLiquidityToPairViaRouter(r: ContractTestContext, pairToken: Contract) {
    await r.archToken.connect(r.treasurySigner).transfer(owner.address, archTotalLiq);

    const routeInstance = await getRouter(r);

    await r.archToken.approve(routeAddress, archTotalLiq);

    const tokenUSDC = new ethers.Contract(usdcAddress, abiUSDTToken, owner);
    await tokenUSDC.approve(routeAddress, usdcTotalLiq);

    await routeInstance.addLiquidity(
        r.archToken.address,
        addressUSDC,
        archTotalLiq,
        usdcTotalLiq,
        archMinLiq,
        usdcMinLiq,
        owner.address,
        1670978314,
    );
    await ethers.provider.send("evm_mine");

    await pairToken.getReserves();
}

export async function createUniswapPool(r: ContractTestContext) {
    // await getUserSomeWETH(r);
    await getUSDCToUser(r, usdcTotalLiq);
    const pairToken = await createPair(r);

    await addLiquidityToPairViaRouter(r, pairToken);

    await ethers.provider.send("evm_mine");
}

async function getUSDCToUser(r: ContractTestContext, amount = bnFromNum(500, 6)) {
    const router = await getRouter(r);
    /// Using USDT abi for USDC as its the same (erc20)
    const tokenUSDC = new ethers.Contract(usdcAddress, abiUSDTToken, owner);
    await router.swapExactETHForTokens(amount, [addressWETH9, usdcAddress], owner.address, 1670978314, { value: bnFromNum(42) });
}

async function getDAIToUser(r: ContractTestContext) {
    // Notice dai is 18 decimal
    const router = await getRouter(r);
    /// Using USDT abi for USDC as its the same (erc20)
    const tokenDAI = new ethers.Contract(daiAddress, abiUSDTToken, owner);
    await router.swapExactETHForTokens(bnFromNum(500, 18), [addressWETH9, daiAddress], owner.address, 1670978314, { value: bnFromNum(1) });
}

async function setupFixture() {
    // build mainnet fork and deploy archimedes
    r = await buildContractTestContext();
    owner = r.owner;
    user = r.addr1;

    // Add zapper. Need to be move into buildContractTestContext once done.
    const zapperFactory = await ethers.getContractFactory("Zapper");
    const zapper = await hre.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
    await zapper.setDependencies(r.leverageEngine.address, r.archToken.address, r.parameterStore.address);

    // fund some LvUSD + setup for being able to create positions
    await r.lvUSD.setMintDestination(r.coordinator.address);
    await r.lvUSD.mint(bnFromNum(100000));

    await startAuctionAcceptLeverageAndEndAuction(r, bnFromNum(100000), 5, bnFromNum(9), bnFromNum(10));
    await setRolesForEndToEnd(r);

    // Create pool and get user some USDT [TODO: Add more tokens]
    await createUniswapPool(r);
    await helperSwapETHWithUSDT(owner, bnFromNum(1));
    const usdtBalance = await r.externalUSDT.balanceOf(owner.address);

    return { r, zapper };
}

// class Position {
//     stableAmountIn: BigNumber;
//     cycles: number;
//     slippage: number;
//     baseAddress: string;
//     useUserArch: boolean;
//     user: SignerWithAddress;
// }

async function zapIntoPosition(
    r: ContractTestContext,
    zapper: Contract,
    useUserArch = false,
    positionOpenSigner = r.owner,
    stableAmount: BigNumber = bnFromNum(10, 6),
    cycles = defaultCycles,
    slippage = 990) {
    console.log("---- start zap into position with user arch %s and stable %s ----", useUserArch, stableAmount);
    /// Important notice, make sure stable amount is in correct decimal
    const baseAddress = addressUSDT;
    const previewAmounts = await zapper.previewZapInAmount(stableAmount, cycles, baseAddress, useUserArch);
    // we are using preview
    const previewOUSDAmount = previewAmounts.ousdCollateralAmountReturn;
    const previewArchAmount = previewAmounts.archTokenAmountReturn;

    // / debug numbers
    const numPreviewArchAmount = ethers.utils.formatUnits(previewArchAmount, 18);
    const numPreviewOUSDAmount = ethers.utils.formatUnits(previewOUSDAmount, 18);
    console.log("arch amount estimated %s", numPreviewArchAmount);
    console.log("ousd amount estimated %s", numPreviewOUSDAmount);
    const levFromPrincipalEst = await r.parameterStore.getAllowedLeverageForPosition(previewOUSDAmount, cycles);
    const archToPayForPrincpleEst = await r.parameterStore.calculateArchNeededForLeverage(levFromPrincipalEst);
    const numLevFromPrincipalEst = ethers.utils.formatUnits(levFromPrincipalEst, 18);
    const numArchToPayForPrincpleEst = ethers.utils.formatUnits(archToPayForPrincpleEst, 18);
    console.log("estimated arch token fee in arch %s while lev estimated is %s", numArchToPayForPrincpleEst, numLevFromPrincipalEst);
    console.log("end debug numbers");
    // End debug numbers

    const archAmountBN = ethers.utils.parseUnits(previewArchAmount.toString(), 0);
    if (useUserArch) {
        /// caluclate the amount of arch to approve based on slippage
        const archAmountWithSlippage = archAmountBN.mul(1000).div(slippage);
        console.log("approving min amount of arch buffered: %s", ethers.utils.formatUnits(archAmountWithSlippage, 18));
        console.log("auction bidding price is of arch is %s", ethers.utils.formatUnits(
            await r.auction.getCurrentBiddingPrice(), 18));
        await r.archToken.connect(positionOpenSigner).approve(zapper.address, archAmountWithSlippage);
    }
    // console.log("Approved archAmountBN as positionOpenSigner");
    await r.externalUSDT.connect(positionOpenSigner).approve(zapper.address, stableAmount);
    console.log("Approved % USDT stableAmount as positionOpenSigner", ethers.utils.formatUnits(stableAmount, 6));
    return zapper.connect(positionOpenSigner).zapIn(stableAmount, cycles, previewArchAmount, previewOUSDAmount, slippage, baseAddress, useUserArch);
}

async function zapOutPositionWithAnyBase(
    r: ContractTestContext,
    zapper: Contract, baseToken: Contract, stableAmount: BigNumber, useUserArch = false) {
    const previewAmounts = await zapper.previewZapInAmount(stableAmount, defaultCycles, baseToken.address, useUserArch);
    const previewOUSDAmount = previewAmounts.ousdCollateralAmountReturn;
    const previewArchAmount = previewAmounts.archTokenAmountReturn;
    await baseToken.approve(zapper.address, stableAmount);
    await zapper.zapIn(stableAmount, defaultCycles, previewArchAmount, previewOUSDAmount, 990, baseToken.address, useUserArch);
}

async function getUSDTFromEth(
    r: ContractTestContext,
    ethAmountForEstimate = bnFromNum(1),
): Promise<BigNumber> {
    const uniswapRouter = await getRouter(r);
    const amountsReturned = await uniswapRouter.getAmountsOut(
        ethAmountForEstimate,
        [addressWETH9, addressUSDT]);
    return amountsReturned[1];
}

async function getEthFromUSDT(
    r: ContractTestContext,
    usdtAmountForEstimate: BigNumber,
): Promise<BigNumber> {
    const uniswapRouter = await getRouter(r);
    const amountsReturned = await uniswapRouter.getAmountsOut(
        usdtAmountForEstimate,
        [addressUSDT, addressWETH9]);
    return amountsReturned[1];
}

async function getArchFromUSDT(
    r: ContractTestContext,
    usdtAmountForEstimate: BigNumber): Promise<BigNumber> {
    const uniswapRouter = await getRouter(r);
    const amountsReturned = await uniswapRouter.getAmountsOut(
        usdtAmountForEstimate,
        [addressUSDT, addressUSDC, r.archToken.address]);
    return amountsReturned[2];
}

async function getArchPriceInDollars(
    r: ContractTestContext,
    dollarAmountForEstimate = 100): Promise<number> {
    const uniswapRouter = await getRouter(r);
    const amountsReturned = await uniswapRouter.getAmountsOut(
        ethers.utils.parseUnits(dollarAmountForEstimate.toString(), 6),
        [addressUSDC, r.archToken.address]);
    const numberOfArchTokensReturned = numFromBn(amountsReturned[1], 18);
    const archPrice = dollarAmountForEstimate / numberOfArchTokensReturned;
    return archPrice;
}

function computeMultiplier(cycles: number, rate = 0.95): number {
    let multiplier = rate;
    let rateMultiple = rate;
    for (let i = 1; i < cycles; i++) {
        rateMultiple *= rate;
        multiplier += rateMultiple;
    }
    return multiplier;
}

function allowedMargin(num: number) {
    return num * 0.05;
}

/*
    D - Deposit
    F - Fee Rate
    M - Cycle Multiplier
    X - Asset 1 Pool Size
    Y - Asset 2 Pool Size
    A - Auction Price
*/
// function computeCollateral(
//     D: number, F: number, M: number, X: number, Y: number, A: number,
// ): number {
//     const a = F * M;
//     const s = F * Y * A;
//     const b = (D * a + s) + X * M;
//     const c = D * s;
//     return ((-1 * b) + Math.sqrt(b ** 2 + 4 * a * c)) / (2 * a);
// }

// Computes collateral in dollar amount and interest in arch amount
// async function computeSplit(
//     r: ContractTestContext, stableDeposit: BigNumber, cycles = defaultCycles, feeRate = 0.993,
// ): Promise<[usdt: number, arch: number, lvusd: number]> {
//     // const ethDeposit = await getEthFromUSDT(r, usdtDeposit);
//     // const ethLiqInUSDT = await getUSDTFromEth(r, ethTotalLiq);
//     const m = computeMultiplier(cycles);
//     const auctionPrice = await r.auction.getCurrentBiddingPrice();
//     const collateralScaled = computeCollateral(
//         numFromBn(stableDeposit, 6),
//         feeRate,
//         m,
//         numFromBn(usdcTotalLiq, 6),
//         numFromBn(archTotalLiq),
//         numFromBn(auctionPrice),
//     ) * 0.97;
//     console.log("This worked", collateralScaled);
//     const stableCollateral = round(collateralScaled);
//     console.log("a", stableCollateral);
//     console.log(stableDeposit);
//     const stableInterest = numFromBn(stableDeposit, 6) - stableCollateral;
//     console.log("b", stableInterest);
//     const archInterest = await getArchPriceInDollars(r, stableInterest);
//     console.log("c");
//     return [stableCollateral, archInterest, stableCollateral * m];
// }

describe("Zapper test suite", function () {
    describe("Basic Zapper test", function () {
        it("Should add CDP values to zapped in position", async function () {
            const { r, zapper } = await loadFixture(setupFixture);

            console.log("auction bidding price is of arch is %s", ethers.utils.formatUnits(
                await r.auction.getCurrentBiddingPrice(), 18));

            await zapIntoPosition(r, zapper);

            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(positionId));

            expect(collateral).to.be.closeTo(8, 1);
            expect(leverage).to.be.closeTo(34, 2);
        });

        it("Should be able to create several bigger and bigger positions using user owned Arch token", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            await r.archToken.connect(r.treasurySigner).transfer(owner.address, bnFromNum(10));
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(10));
            await zapIntoPosition(r, zapper, false);
            await zapIntoPosition(r, zapper, false, r.owner, bnFromNum(7, 6));

            const collateral0 = numFromBn(await r.cdp.getOUSDPrinciple(0));
            const collateral1 = numFromBn(await r.cdp.getOUSDPrinciple(1));
            console.log("Collateral 0: %s", collateral0);
            console.log("Collateral 1: %s", collateral1);

            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            expect(await r.positionToken.ownerOf(1)).to.equal(owner.address);

            // const collateral0 = numFromBn(await r.cdp.getOUSDPrinciple(0));
            // const collateral1 = numFromBn(await r.cdp.getOUSDPrinciple(1));

            // console.log("Collateral 0: %s", collateral0);
            // console.log("Collateral 1: %s", collateral1);
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

            await zapIntoPosition(r, zapper, true);

            await zapIntoPosition(r, zapper);

            await zapIntoPosition(r, zapper, true);

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

        it("Should emit ZapIn event", async function () {
            const usdtAmount = bnFromNum(105, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            const expectedPositionID = 0;
            const expectedTotalStableAmount = usdtAmount.toString();
            const expectedBaseStableAddress = addressUSDT;
            const expectedUsedUserArch = false;

            const promise = zapIntoPosition(r, zapper, false, owner, usdtAmount);

            await expect(promise).to
                .emit(zapper, "ZapIn").withArgs(
                    expectedPositionID,
                    expectedTotalStableAmount,
                    expectedBaseStableAddress,
                    expectedUsedUserArch,
                );
        });
    });

    describe("non USDT Zapper test", function () {
        it("Should create position with USDC", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            await getUSDCToUser(r);
            const tokenUSDC = new ethers.Contract(usdcAddress, abiUSDTToken, owner);
            const usdcBalance = await tokenUSDC.balanceOf(owner.address);
            console.log(usdcBalance);
            const amount = bnFromNum(10, 6);
            await zapOutPositionWithAnyBase(r, zapper, tokenUSDC, amount);
            // await printPositionInfo(r);

            const usdcBalanceAfter = await tokenUSDC.balanceOf(owner.address);

            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            expect(usdcBalanceAfter).to.be.closeTo(usdcBalance.sub(exchangeAmount), 1);
        });

        it("Should create position with DAI", async function () {
            /// Most of the tests assume base stable is 6 decimals but DAI is 18 decimals. So change it just for this test!
            const exchangeAmount18Decimal = bnFromNum(10);
            const { r, zapper } = await loadFixture(setupFixture);
            await getDAIToUser(r);

            const tokenDAI = new ethers.Contract(daiAddress, abiUSDTToken, owner);

            const daiBalance = await tokenDAI.balanceOf(owner.address);

            await zapOutPositionWithAnyBase(r, zapper, tokenDAI, exchangeAmount18Decimal);

            const daiBalanceAfter = await tokenDAI.balanceOf(owner.address);

            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            expect(daiBalanceAfter).to.be.closeTo(daiBalance.sub(exchangeAmount18Decimal), 1);
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
            // await r.parameterStore.changeArchToLevRatio(bnFromNum(10));
            const archPrice = await getArchPriceInDollars(r, amountInBase);
            const split = await zapper.previewTokenSplit(bnFromNum(amountInBase, 6), defaultCycles, addressUSDT);

            const collateral = numFromBn(split[0], 6);
            const dollarsToPayForArch = numFromBn(split[1], 6);
            const leverageAmount = numFromBn(
                await r.parameterStore.getAllowedLeverageForPosition(
                    ethers.utils.parseUnits(collateral.toString()),
                    defaultCycles),
            );
            const archToLevRatio = numFromBn(await r.parameterStore.getArchToLevRatio());
            const dollarsToPayForCollCalc = amountInBase - (leverageAmount * archPrice) / archToLevRatio;
            const dollarsToPayForArchCalc = amountInBase - dollarsToPayForCollCalc;
            expect(dollarsToPayForCollCalc).to.be.closeTo(collateral, 0.5);
            expect(dollarsToPayForArchCalc).to.be.closeTo(dollarsToPayForArch, 0.5);
        });

        it("should previewAmounts correctly when zapping both arch and OUSD", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            const exchangeAmount = bnFromNum(amountInBase, 6);
            let [collateralAmount, archAmount] =
                await zapper.previewZapInAmount(exchangeAmount, defaultCycles, addressUSDT, false);
            collateralAmount = numFromBn(collateralAmount);
            archAmount = numFromBn(archAmount);
            expect(collateralAmount).to.be.closeTo(8.1, 0.5);
            expect(archAmount).to.be.closeTo(3.6, 0.5);
        });

        it("should previewAmounts correctly when zapping a large amount", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            const exchangeAmount = bnFromNum(12780, 6);
            let [collateralAmount, archAmount] =
                await zapper.previewZapInAmount(exchangeAmount, defaultCycles, addressUSDT, false);
            collateralAmount = numFromBn(collateralAmount);
            archAmount = numFromBn(archAmount);

            // const [expectedCollateral, expectedInterest] = await computeSplit(r, exchangeAmount);
            const expectedCollateral = 10321;
            const expectedInterest = 4668;
            const expectedMargin = allowedMargin(expectedCollateral);

            expect(collateralAmount).to.be.closeTo(expectedCollateral, expectedMargin);
            expect(archAmount).to.be.closeTo(expectedInterest, expectedMargin);
        });

        it("should previewAmounts correctly when zapping a very large amount", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            const exchangeAmount = bnFromNum(45632.67311, 6);
            let [collateralAmount, archAmount] =
                await zapper.previewZapInAmount(exchangeAmount, defaultCycles, addressUSDT, false);
            collateralAmount = numFromBn(collateralAmount);
            archAmount = numFromBn(archAmount);

            // const [expectedCollateral, expectedInterest] = await computeSplit(r, exchangeAmount);
            const expectedCollateral = 35926;
            const expectedInterest = 16180;
            const expectedMargin = allowedMargin(expectedCollateral);

            expect(collateralAmount).to.be.closeTo(expectedCollateral, expectedMargin);
            expect(archAmount).to.be.closeTo(expectedInterest, expectedMargin);
        });

        it("should previewAmounts correctly when zapping a small amount", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            const exchangeAmount = bnFromNum(3, 6);
            let [collateralAmount, archAmount] =
                await zapper.previewZapInAmount(exchangeAmount, defaultCycles, addressUSDT, false);
            collateralAmount = numFromBn(collateralAmount);
            archAmount = numFromBn(archAmount);

            // const [expectedCollateral, expectedInterest] = await computeSplit(r, exchangeAmount);
            const expectedCollateral = 2.4;
            const expectedInterest = 1.1;
            const expectedMargin = allowedMargin(expectedCollateral);

            expect(collateralAmount).to.be.closeTo(expectedCollateral, expectedMargin);
            expect(archAmount).to.be.closeTo(expectedInterest, expectedMargin);
        });

        it("should previewAmounts correctly when zapping a non round amount", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            const exchangeAmount = bnFromNum(10.872163, 6);
            let [collateralAmount, archAmount] =
                await zapper.previewZapInAmount(exchangeAmount, defaultCycles, addressUSDT, false);
            collateralAmount = numFromBn(collateralAmount);
            archAmount = numFromBn(archAmount);

            // const [expectedCollateral, expectedInterest] = await computeSplit(r, exchangeAmount);
            const expectedCollateral = 8.8;
            const expectedInterest = 4;
            const expectedMargin = allowedMargin(expectedCollateral);

            expect(collateralAmount).to.be.closeTo(expectedCollateral, expectedMargin);
            expect(archAmount).to.be.closeTo(expectedInterest, expectedMargin);
        });

        it("should previewAmounts correctly when zapping just USDT and using arch from users wallet",
            async function () {
                const { r, zapper } = await loadFixture(setupFixture);
                const exchangeAmount = bnFromNum(amountInBase, 6);
                let [collateralAmount, archAmount] = await zapper.previewZapInAmount(exchangeAmount, defaultCycles, addressUSDT, true);
                collateralAmount = numFromBn(collateralAmount);
                archAmount = numFromBn(archAmount);
                expect(collateralAmount).to.be.closeTo(10, 0.5);
                // Notice we need more Arch tokens in compared to test above because collateral is higher
                expect(archAmount).to.be.closeTo(4.3, 0.5);
            });
    });

    describe("open different size positions", function () {
        it("Should be able to open a position with high amount (200 USDT)", async function () {
            const usdtAmount = bnFromNum(200, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            const usdtBalance = numFromBn(await r.externalUSDT.balanceOf(owner.address), 6);
            expect(usdtBalance).to.be.greaterThan(200);
            await zapIntoPosition(r, zapper, false, owner, usdtAmount);
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount);
            const expectedCollateral = 162;
            const expectedLeverage = 700;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);

            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });

        it("Should be able to open a position with precise amount (10.872163 USDT)", async function () {
            const usdtAmount = bnFromNum(10.872163, 6);
            const { r, zapper } = await loadFixture(setupFixture);

            await zapIntoPosition(r, zapper, false, owner, usdtAmount);

            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            console.log("checking that position was created and owned by ownwer");

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount);
            const expectedCollateral = 8.8;
            const expectedLeverage = 38;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);

            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });

        it("Should be able to open a position with low amount (3 USDT)", async function () {
            const usdtAmount = bnFromNum(3, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            // zapIntoPosition(r, zapper, false, owner,)
            // await r.externalUSDT.approve(zapper.address, usdtAmount);
            // await zapper.zapIn(usdtAmount, defaultCycles, 990, addressUSDT, false);

            await zapIntoPosition(r, zapper, false, owner, usdtAmount);

            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount);
            const expectedCollateral = 2.4;
            const expectedLeverage = 10.5;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);

            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });

        it("Should be able to open a position with very large amount (2500 USDT)", async function () {
            const usdtAmount = bnFromNum(2500, 6);
            const { r, zapper } = await loadFixture(setupFixture);

            // Give user a large amount of USDT
            await helperSwapETHWithUSDT(owner, bnFromNum(4));

            await zapIntoPosition(r, zapper, false, owner, usdtAmount);

            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);
            console.log("Done with position creation");
            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount);
            // const expectedMargin = allowedMargin(expectedCollateral);
            // const expectedLeverageMargin = allowedMargin(expectedLeverage);

            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            // expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(2033, 5);
        });
    });

    describe("Open different cycle amount positions", function () {
        it("Should be able to open a position with 1 cycle", async function () {
            const usdtAmount = bnFromNum(100, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            // await r.externalUSDT.approve(zapper.address, usdtAmount);
            // await zapper.zapIn(usdtAmount, 1, 990, addressUSDT, false);
            await zapIntoPosition(r, zapper, false, owner, usdtAmount, 1);
            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount, 1);
            const expectedCollateral = 94;
            const expectedLeverage = 89;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);
            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });

        it("Should be able to open a position with 3 cycles", async function () {
            const usdtAmount = bnFromNum(100, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            // await r.externalUSDT.approve(zapper.address, usdtAmount);
            // await zapper.zapIn(usdtAmount, 3, 990, addressUSDT, false);
            await zapIntoPosition(r, zapper, false, owner, usdtAmount, 3);
            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount, 3);
            const expectedCollateral = 90;
            const expectedLeverage = 236.2;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);
            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });

        it("Should be able to open a position with 10 cycles", async function () {
            const usdtAmount = bnFromNum(100, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            // await r.externalUSDT.approve(zapper.address, usdtAmount);
            // await zapper.zapIn(usdtAmount, 10, 990, addressUSDT, false);
            await zapIntoPosition(r, zapper, false, owner, usdtAmount, 10);
            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount, 10);
            const expectedCollateral = 71.5;
            const expectedLeverage = 545.7;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);
            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });
    });

    describe("Slippage Tests", function () {
        it("Should be able to open a position with 96% slippage tolerance", async function () {
            const usdtAmount = bnFromNum(100, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            await zapIntoPosition(r, zapper, false, owner, usdtAmount, defaultCycles, 960);
            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount);
            const expectedCollateral = 81;
            const expectedLeverage = 350;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);
            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });

        it("Should be able to open a position with 99.9% slippage tolerance", async function () {
            const usdtAmount = bnFromNum(100, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            await zapIntoPosition(r, zapper, false, owner, usdtAmount, defaultCycles, 999);
            // Check for creation of position nft
            expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

            // const [expectedCollateral, _, expectedLeverage] = await computeSplit(r, usdtAmount);
            const expectedCollateral = 81;
            const expectedLeverage = 350;
            const expectedMargin = allowedMargin(expectedCollateral);
            const expectedLeverageMargin = allowedMargin(expectedLeverage);
            // Check for correct leverage in position
            const leverage = numFromBn(await r.cdp.getLvUSDBorrowed(0));
            expect(leverage).to.be.closeTo(expectedLeverage, expectedLeverageMargin);
            // Check for correct collateral amount
            const collateral = numFromBn(await r.cdp.getOUSDPrinciple(positionId));
            expect(collateral).to.be.closeTo(expectedCollateral, expectedMargin);
        });
    });

    describe("Revert cases", function () {
        it("Should revert if no collateral is given", async function () {
            const { zapper } = await loadFixture(setupFixture);
            await expect(
                zapper.zapIn(0, defaultCycles, archMinLiq, archMinLiq, 990, addressUSDT, false),
            ).to.be.revertedWith("err:stableCoinAmount==0");
        });

        it("Should revert if collateral is too low", async function () {
            const usdtAmount = bnFromNum(0.003, 6);
            const { r, zapper } = await loadFixture(setupFixture);
            // await r.externalUSDT.approve(zapper.address, usdtAmount);
            await expect(
                zapIntoPosition(r, zapper, false, owner, usdtAmount),
            ).to.be.revertedWith("Collateral lower then min");
        });

        it("Should revert if attempting to use user arch but there isn't enough", async function () {
            const { r, zapper } = await loadFixture(setupFixture);
            // 1 Arch is not enough
            await r.archToken.connect(r.treasurySigner).transfer(owner.address, bnFromNum(1));
            await r.archToken.connect(owner).approve(zapper.address, bnFromNum(1));
            await expect(
                zapIntoPosition(r, zapper, true, owner),
            ).to.be.revertedWith("err:insuf user arch");
        });
    });
});
/* eslint-disable max-len */
const factoryABI = [{ inputs: [{ internalType: "address", name: "_feeToSetter", type: "address" }], payable: false, stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "token0", type: "address" }, { indexed: true, internalType: "address", name: "token1", type: "address" }, { indexed: false, internalType: "address", name: "pair", type: "address" }, { indexed: false, internalType: "uint256", name: "", type: "uint256" }], name: "PairCreated", type: "event" }, { constant: true, inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "allPairs", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "allPairsLength", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }], name: "createPair", outputs: [{ internalType: "address", name: "pair", type: "address" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "feeTo", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "feeToSetter", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "address", name: "", type: "address" }], name: "getPair", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_feeTo", type: "address" }], name: "setFeeTo", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_feeToSetter", type: "address" }], name: "setFeeToSetter", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }];
const routerABI = [{ inputs: [{ internalType: "address", name: "_factory", type: "address" }, { internalType: "address", name: "_WETH", type: "address" }], stateMutability: "nonpayable", type: "constructor" }, { inputs: [], name: "WETH", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }, { internalType: "uint256", name: "amountADesired", type: "uint256" }, { internalType: "uint256", name: "amountBDesired", type: "uint256" }, { internalType: "uint256", name: "amountAMin", type: "uint256" }, { internalType: "uint256", name: "amountBMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "addLiquidity", outputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "amountB", type: "uint256" }, { internalType: "uint256", name: "liquidity", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "amountTokenDesired", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "addLiquidityETH", outputs: [{ internalType: "uint256", name: "amountToken", type: "uint256" }, { internalType: "uint256", name: "amountETH", type: "uint256" }, { internalType: "uint256", name: "liquidity", type: "uint256" }], stateMutability: "payable", type: "function" }, { inputs: [], name: "factory", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint256", name: "reserveIn", type: "uint256" }, { internalType: "uint256", name: "reserveOut", type: "uint256" }], name: "getAmountIn", outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }], stateMutability: "pure", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "reserveIn", type: "uint256" }, { internalType: "uint256", name: "reserveOut", type: "uint256" }], name: "getAmountOut", outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }], stateMutability: "pure", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }], name: "getAmountsIn", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }], name: "getAmountsOut", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "reserveA", type: "uint256" }, { internalType: "uint256", name: "reserveB", type: "uint256" }], name: "quote", outputs: [{ internalType: "uint256", name: "amountB", type: "uint256" }], stateMutability: "pure", type: "function" }, { inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountAMin", type: "uint256" }, { internalType: "uint256", name: "amountBMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "removeLiquidity", outputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "amountB", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "removeLiquidityETH", outputs: [{ internalType: "uint256", name: "amountToken", type: "uint256" }, { internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "removeLiquidityETHSupportingFeeOnTransferTokens", outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "bool", name: "approveMax", type: "bool" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "removeLiquidityETHWithPermit", outputs: [{ internalType: "uint256", name: "amountToken", type: "uint256" }, { internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountTokenMin", type: "uint256" }, { internalType: "uint256", name: "amountETHMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "bool", name: "approveMax", type: "bool" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens", outputs: [{ internalType: "uint256", name: "amountETH", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "tokenA", type: "address" }, { internalType: "address", name: "tokenB", type: "address" }, { internalType: "uint256", name: "liquidity", type: "uint256" }, { internalType: "uint256", name: "amountAMin", type: "uint256" }, { internalType: "uint256", name: "amountBMin", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "bool", name: "approveMax", type: "bool" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "removeLiquidityWithPermit", outputs: [{ internalType: "uint256", name: "amountA", type: "uint256" }, { internalType: "uint256", name: "amountB", type: "uint256" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapETHForExactTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "payable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactETHForTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "payable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactETHForTokensSupportingFeeOnTransferTokens", outputs: [], stateMutability: "payable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForETH", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForETHSupportingFeeOnTransferTokens", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }, { internalType: "uint256", name: "amountOutMin", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapExactTokensForTokensSupportingFeeOnTransferTokens", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint256", name: "amountInMax", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapTokensForExactETH", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint256", name: "amountInMax", type: "uint256" }, { internalType: "address[]", name: "path", type: "address[]" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "swapTokensForExactTokens", outputs: [{ internalType: "uint256[]", name: "amounts", type: "uint256[]" }], stateMutability: "nonpayable", type: "function" }, { stateMutability: "payable", type: "receive" }];
const pairABI = [{ inputs: [], payable: false, stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: true, internalType: "address", name: "spender", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Approval", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: false, internalType: "uint256", name: "amount0", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1", type: "uint256" }, { indexed: true, internalType: "address", name: "to", type: "address" }], name: "Burn", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: false, internalType: "uint256", name: "amount0", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1", type: "uint256" }], name: "Mint", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "sender", type: "address" }, { indexed: false, internalType: "uint256", name: "amount0In", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1In", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount0Out", type: "uint256" }, { indexed: false, internalType: "uint256", name: "amount1Out", type: "uint256" }, { indexed: true, internalType: "address", name: "to", type: "address" }], name: "Swap", type: "event" }, { anonymous: false, inputs: [{ indexed: false, internalType: "uint112", name: "reserve0", type: "uint112" }, { indexed: false, internalType: "uint112", name: "reserve1", type: "uint112" }], name: "Sync", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "from", type: "address" }, { indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Transfer", type: "event" }, { constant: true, inputs: [], name: "DOMAIN_SEPARATOR", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "MINIMUM_LIQUIDITY", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "PERMIT_TYPEHASH", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "address", name: "", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }], name: "burn", outputs: [{ internalType: "uint256", name: "amount0", type: "uint256" }, { internalType: "uint256", name: "amount1", type: "uint256" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "factory", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "getReserves", outputs: [{ internalType: "uint112", name: "_reserve0", type: "uint112" }, { internalType: "uint112", name: "_reserve1", type: "uint112" }, { internalType: "uint32", name: "_blockTimestampLast", type: "uint32" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_token0", type: "address" }, { internalType: "address", name: "_token1", type: "address" }], name: "initialize", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "kLast", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }], name: "mint", outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }], name: "nonces", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }, { internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "uint8", name: "v", type: "uint8" }, { internalType: "bytes32", name: "r", type: "bytes32" }, { internalType: "bytes32", name: "s", type: "bytes32" }], name: "permit", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "price0CumulativeLast", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "price1CumulativeLast", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }], name: "skim", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount0Out", type: "uint256" }, { internalType: "uint256", name: "amount1Out", type: "uint256" }, { internalType: "address", name: "to", type: "address" }, { internalType: "bytes", name: "data", type: "bytes" }], name: "swap", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [], name: "sync", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "token0", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "token1", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }], name: "transfer", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }], name: "transferFrom", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }];
