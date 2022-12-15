import { assert, expect } from "chai";
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
    helperSwapETHWithUSDT,
    helperResetNetwork,
    defaultBlockNumber,
    addressWETH9,
} from "./MainnetHelper";
import { helperSwapETHWithOUSD } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext, setRolesForEndToEnd } from "./ContractTestContext";
import { formatUnits } from "ethers/lib/utils";
import { logger } from "../logger";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
/// uniswap imports
// import { Pool } from '@uniswap/v2-core/contracts/interfaces/IUniswapV3Factory'
// import { Token } from '@uniswap/sdk-core'

// import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
// import IUniswapV2Factory from '@uniswap/v2-core/build/IUniswapV2Factory.json'

// import { abi as IUniswapV3Factory } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
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
    const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const usdtToDeposit: BigNumber = bnFromNum(100);
    const minLiq = bnFromNum(100)

    let r: ContractTestContext;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let externalOUSD: Contract;
    let externalUSDT: Contract;
    let external3CRV: Contract;
    let externalWETH: Contract;

    async function getUserSomeWETH(r: ContractTestContext) {
        externalWETH = new ethers.Contract(addressWETH9, abiWETH9Token, owner);
        await ethers.provider.send("evm_mine");
        let weth9Balance = await externalWETH.balanceOf(owner.address);
        await externalWETH.deposit({ value: bnFromNum(1) });
        weth9Balance = await externalWETH.balanceOf(owner.address);
        // console.log("weth9Balance: %s", numFromBn(weth9Balance));
    }

    async function createPair(r: ContractTestContext): Contract {
        const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
        const uniswapFactory = new ethers.Contract(factoryAddress, factoryABI, owner);
        const tx: ContractTransaction = await uniswapFactory.createPair(r.archToken.address, addressWETH9)
        let receipt: ContractReceipt = await tx.wait();
        let pairCreatedEvent = receipt.events?.filter((x) => { return x.event == "PairCreated" });
        const pairAddress = pairCreatedEvent[0].args.pair;
        const pairToken = new ethers.Contract(pairAddress, pairABI, owner);
        return pairToken;
    }

    async function getRouter(r: ContractTestContext): Contract {
        const routeToken = new ethers.Contract(routeAddress, routerABI, owner);
        return routeToken;
    }
    async function addLiquidityToPairViaRouter(r: ContractTestContext, pairToken: Contract) {
        await r.archToken.connect(r.treasurySigner).transfer(owner.address, minLiq)

        const routeInstance = await getRouter(r);

        await r.archToken.approve(routeAddress, minLiq)

        await routeInstance.addLiquidityETH(
            r.archToken.address,
            minLiq,
            bnFromNum(100),
            bnFromNum(0.001),
            owner.address,
            1670978314,
            { value: bnFromNum(0.04) } // The amount in Eth to send to pair, long calc but it is worth 100
        )
        await ethers.provider.send("evm_mine");

        const reserves = await pairToken.getReserves();
        // console.log("reserves0, r1 : %s %s ", numFromBn(reserves._reserve0), numFromBn(reserves._reserve1))
    }

    async function createUniswapPool(r: ContractTestContext) {
        await getUserSomeWETH(r);
        const pairToken = await createPair(r)

        // await helperSwapETHWith3CRV(r.owner, bnFromNum(1));

        await addLiquidityToPairViaRouter(r, pairToken);

        await ethers.provider.send("evm_mine");

        const router = await getRouter(r);

        await ethers.provider.send("evm_mine");


        const tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, owner);
        await helperSwapETHWithUSDT(owner, bnFromNum(1));
        const usdtBalance = await tokenUSDT.balanceOf(owner.address);
        await tokenUSDT.approve(routeAddress, usdtBalance);

        await ethers.provider.send("evm_mine");


        const archTokenBalancBefore = await r.archToken.balanceOf(owner.address);
        const wethBalanceBefore = await externalWETH.balanceOf(owner.address);
        const usdtBalanceBefore = await tokenUSDT.balanceOf(owner.address);
        // console.log("USDT balance before : ", ethers.utils.formatUnits(usdtBalanceBefore, 6))
        // console.log("arch balance before : %s %s ", numFromBn(archTokenBalancBefore), archTokenBalancBefore)
        // console.log("weth balance before : ", numFromBn(wethBalanceBefore));
        /* 
        function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
            external
            payable
            returns (uint[] memory amounts);
        */
        // await router.swapETHForExactTokens(ethers.utils.parseUnits("5", 6), [addressWETH9, tokenUSDT.address], owner.address, 1670978314, { value: bnFromNum(12) })
        // await router.swapExactTokensForETH(ethers.utils.parseUnits("200", 6), 0, [tokenUSDT.address, addressWETH9], owner.address, 1670978314)

        /// THIS ONE works!
        await router.swapExactTokensForTokens(ethers.utils.parseUnits("50", 6), 0, [tokenUSDT.address, addressWETH9, r.archToken.address], owner.address, 1670978314)
        /// ^^

        /// Now lets try to get 

        await ethers.provider.send("evm_mine");

        const archTokenBalancAfter = await r.archToken.balanceOf(owner.address);
        const wethBalanceAfter = await externalWETH.balanceOf(owner.address);
        const usdtBalanceAfter = await tokenUSDT.balanceOf(owner.address);
        // console.log("USDT balance AFTER : ", ethers.utils.formatUnits(usdtBalanceAfter, 6))
        // console.log("arch balance after : %s %s", numFromBn(archTokenBalancAfter), archTokenBalancAfter);
        // console.log("weth balance after : ", numFromBn(wethBalanceAfter));
        // const reserves = await pairToken.getReserves();
        // console.log("reserves : ", reserves);
        /// Take liquidity



        // const tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, owner);
        // await helperSwapETHWithUSDT(owner, bnFromNum(1));
        // const usdtBalance = await tokenUSDT.balanceOf(owner.address);
        // await tokenUSDT.approve(routeAddress, usdtBalance);

        // console.log("usdt balance : ", ethers.utils.formatUnits(usdtBalance, 6));

        await ethers.provider.send("evm_mine");

        /*
        function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
        ) external returns (uint[] memory amounts); 
        */

        // const amountIn = await router.getAmountsIn(bnFromNum(1), [addressUSDT, addressWETH9, r.archToken.address]);
        // console.log("amountIn : ", amountIn);

        //   function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        //   external
        //   returns (uint[] memory amounts);

        // await router.swapTokensForExactETH(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("10", 6), [addressUSDT, addressWETH9], owner.address, 1670978314);

        // await router.swapExactTokensForTokens(ethers.utils.parseUnits("10", 6), ethers.utils.parseUnits("1", 18), [addressUSDT, addressWETH9, r.archToken.address], owner.address, 1670978314);

    }
    async function setupFixture() {
        // build mainnet fork and deploy archimedes
        r = await buildContractTestContext();
        owner = r.owner;
        user = r.addr1;

        // Add zapper. Need to be move into buildContractTestContext once done.
        const zapperFactory = await ethers.getContractFactory("Zapper");
        const zapper = await hre.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
        await zapper.setDependencies(addressOUSD, address3CRV,
            addressUSDT, addressCurveOUSDPool, routeAddress,
            r.leverageEngine.address, r.archToken.address, r.parameterStore.address)

        /// transfer some Arch to Zapper for testing
        ///  Remove this as we dont want zapper to have extra Arch 
        // await r.archToken.connect(r.treasurySigner).transfer(zapper.address, bnFromNum(100))

        // fund some LvUSD + setup for being able to create positions
        await r.lvUSD.setMintDestination(r.coordinator.address);
        await r.lvUSD.mint(bnFromNum(10000));

        await r.coordinator.acceptLeverageAmount(bnFromNum(10000));
        await setRolesForEndToEnd(r);


        // tokenUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, owner);


        await createUniswapPool(r)
        await helperSwapETHWithUSDT(owner, bnFromNum(1));
        const usdtBalance = await r.externalUSDT.balanceOf(owner.address)
        // const crvBalance = await r.external3CRV.balanceOf(owner.address)
        console.log("Balance of USDT for owner is " + usdtBalance)
        // console.log("Balance of 3crv for owner is " + crvBalance)

        await r.externalUSDT.approve(addressCurveOUSDPool, usdtBalance);
        await r.externalUSDT.approve(zapper.address, usdtBalance);

        // await r.external3CRV.approve(addressCurveOUSDPool, crvBalance);
        // await r.external3CRV.approve(zapper.address, crvBalance);

        /// Get user some arch 

        console.log("END Setting up")

        return zapper;
    }

    describe("Basic Zapper test", function () {
        /// write a test to check that the zapper is able to exchange some arch from USDT
        it("Should be able to exchange some arch from USDT", async function () {
            const zapper = await loadFixture(setupFixture);
            const exchangeAmount = 10000000;  // this is 10 in 6Decimal
            await r.externalUSDT.transfer(zapper.address, exchangeAmount)
            // clear out Arch token amount of Owner
            // await r.archToken.transfer(r.treasurySigner.address, bnFromNum(100))

            const usdtBalance = await r.externalUSDT.balanceOf(zapper.address)
            const archTokenBalancBefore = await r.archToken.balanceOf(zapper.address)
            console.log("archTokenBalancBefore is " + numFromBn(archTokenBalancBefore))
            console.log("usdtBalanceBefore is " + ethers.utils.formatUnits(usdtBalance, 6));
            await zapper.zapIn(exchangeAmount, bnFromNum(1), 5, 3);

            // console out both usdtBalance after and archTokenBalance after
            const archTokenBalancAfter = await r.archToken.balanceOf(zapper.address)
            console.log("archTokenBalancAfter is " + numFromBn(archTokenBalancAfter))
            const usdtBalanceAfter = await r.externalUSDT.balanceOf(zapper.address)
            console.log("usdtBalanceAfter is " + ethers.utils.formatUnits(usdtBalanceAfter, 6))

            // expect(tokenId).to.equal(1);
        });

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

        // it("Should be able to Zap", async function () {
        //     const zapper = await loadFixture(setupFixture);
        //     const exchangeAmount = 10000000;  // this is 10 in 6Decimal

        //     // console.log("OUSD balance before "  + numFromBn(userOUSDBalanceBefore));
        //     // const usdtBalance = await r.externalUSDT.balanceOf(owner.address)

        //     // const allownaceOfPool = await r.externalUSDT.allowance(owner.address,addressCurveOUSDPool);
        //     // console.log("inTest:usdtBalance sent is " + usdtBalance + " allownce is " + allownaceOfPool);
        //     // const exchangeAmount = 10000000;

        //     /// transfer funds to Zapper. Curve API require funds be on who ever calls it.
        //     await r.externalUSDT.transfer(zapper.address, exchangeAmount)
        //     await zapper.zapIn(exchangeAmount, bnFromNum(1), 5, 3);


        //     const newPositionExists = await r.positionToken.balanceOf(zapper.address)
        //     expect(await r.positionToken.ownerOf(0)).to.equal(owner.address);

        //     /// TODO: Add checks to make sure USDT balance is down on ower
        // });



    });

});

const factoryABI = [{ "inputs": [{ "internalType": "address", "name": "_feeToSetter", "type": "address" }], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "token0", "type": "address" }, { "indexed": true, "internalType": "address", "name": "token1", "type": "address" }, { "indexed": false, "internalType": "address", "name": "pair", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "", "type": "uint256" }], "name": "PairCreated", "type": "event" }, { "constant": true, "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "allPairs", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "allPairsLength", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, { "internalType": "address", "name": "tokenB", "type": "address" }], "name": "createPair", "outputs": [{ "internalType": "address", "name": "pair", "type": "address" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "feeTo", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "feeToSetter", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "getPair", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "_feeTo", "type": "address" }], "name": "setFeeTo", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "_feeToSetter", "type": "address" }], "name": "setFeeToSetter", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }]
const routerABI = [{ "inputs": [{ "internalType": "address", "name": "_factory", "type": "address" }, { "internalType": "address", "name": "_WETH", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [], "name": "WETH", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, { "internalType": "address", "name": "tokenB", "type": "address" }, { "internalType": "uint256", "name": "amountADesired", "type": "uint256" }, { "internalType": "uint256", "name": "amountBDesired", "type": "uint256" }, { "internalType": "uint256", "name": "amountAMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountBMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "addLiquidity", "outputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, { "internalType": "uint256", "name": "amountB", "type": "uint256" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "amountTokenDesired", "type": "uint256" }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountETHMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "addLiquidityETH", "outputs": [{ "internalType": "uint256", "name": "amountToken", "type": "uint256" }, { "internalType": "uint256", "name": "amountETH", "type": "uint256" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "factory", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "uint256", "name": "reserveIn", "type": "uint256" }, { "internalType": "uint256", "name": "reserveOut", "type": "uint256" }], "name": "getAmountIn", "outputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "reserveIn", "type": "uint256" }, { "internalType": "uint256", "name": "reserveOut", "type": "uint256" }], "name": "getAmountOut", "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsIn", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsOut", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, { "internalType": "uint256", "name": "reserveA", "type": "uint256" }, { "internalType": "uint256", "name": "reserveB", "type": "uint256" }], "name": "quote", "outputs": [{ "internalType": "uint256", "name": "amountB", "type": "uint256" }], "stateMutability": "pure", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, { "internalType": "address", "name": "tokenB", "type": "address" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, { "internalType": "uint256", "name": "amountAMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountBMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "removeLiquidity", "outputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, { "internalType": "uint256", "name": "amountB", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountETHMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "removeLiquidityETH", "outputs": [{ "internalType": "uint256", "name": "amountToken", "type": "uint256" }, { "internalType": "uint256", "name": "amountETH", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountETHMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "removeLiquidityETHSupportingFeeOnTransferTokens", "outputs": [{ "internalType": "uint256", "name": "amountETH", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountETHMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bool", "name": "approveMax", "type": "bool" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "removeLiquidityETHWithPermit", "outputs": [{ "internalType": "uint256", "name": "amountToken", "type": "uint256" }, { "internalType": "uint256", "name": "amountETH", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, { "internalType": "uint256", "name": "amountTokenMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountETHMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bool", "name": "approveMax", "type": "bool" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens", "outputs": [{ "internalType": "uint256", "name": "amountETH", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "tokenA", "type": "address" }, { "internalType": "address", "name": "tokenB", "type": "address" }, { "internalType": "uint256", "name": "liquidity", "type": "uint256" }, { "internalType": "uint256", "name": "amountAMin", "type": "uint256" }, { "internalType": "uint256", "name": "amountBMin", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bool", "name": "approveMax", "type": "bool" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "removeLiquidityWithPermit", "outputs": [{ "internalType": "uint256", "name": "amountA", "type": "uint256" }, { "internalType": "uint256", "name": "amountB", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapETHForExactTokens", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactETHForTokens", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactETHForTokensSupportingFeeOnTransferTokens", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForETH", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForETHSupportingFeeOnTransferTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForTokens", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapExactTokensForTokensSupportingFeeOnTransferTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "uint256", "name": "amountInMax", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapTokensForExactETH", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }, { "internalType": "uint256", "name": "amountInMax", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }], "name": "swapTokensForExactTokens", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "nonpayable", "type": "function" }, { "stateMutability": "payable", "type": "receive" }]
const pairABI = [{ "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount0", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }], "name": "Burn", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount0", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1", "type": "uint256" }], "name": "Mint", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount0In", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1In", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount0Out", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount1Out", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }], "name": "Swap", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint112", "name": "reserve0", "type": "uint112" }, { "indexed": false, "internalType": "uint112", "name": "reserve1", "type": "uint112" }], "name": "Sync", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "constant": true, "inputs": [], "name": "DOMAIN_SEPARATOR", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "MINIMUM_LIQUIDITY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "PERMIT_TYPEHASH", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }], "name": "burn", "outputs": [{ "internalType": "uint256", "name": "amount0", "type": "uint256" }, { "internalType": "uint256", "name": "amount1", "type": "uint256" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "factory", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "getReserves", "outputs": [{ "internalType": "uint112", "name": "_reserve0", "type": "uint112" }, { "internalType": "uint112", "name": "_reserve1", "type": "uint112" }, { "internalType": "uint32", "name": "_blockTimestampLast", "type": "uint32" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "_token0", "type": "address" }, { "internalType": "address", "name": "_token1", "type": "address" }], "name": "initialize", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "kLast", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }], "name": "mint", "outputs": [{ "internalType": "uint256", "name": "liquidity", "type": "uint256" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "nonces", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "uint8", "name": "v", "type": "uint8" }, { "internalType": "bytes32", "name": "r", "type": "bytes32" }, { "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "permit", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "price0CumulativeLast", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "price1CumulativeLast", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }], "name": "skim", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "uint256", "name": "amount0Out", "type": "uint256" }, { "internalType": "uint256", "name": "amount1Out", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "swap", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "sync", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "token0", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "token1", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }]