"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pools = void 0;
const hardhat_1 = require("hardhat");
const ValueStore_1 = require("./ValueStore");
const EtherUtils_1 = require("./EtherUtils");
const Logger_1 = require("./Logger");
const NumberBundle_1 = require("./NumberBundle");
const ERC20Utils_1 = require("./ERC20Utils");
const TestConstants_1 = require("./TestConstants");
class Pools {
    async init(contracts, createPool = false) {
        this.contracts = contracts;
        this.owner = contracts.signers.owner;
        this.uniRouter = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressUniswapRouter, ValueStore_1.ValueStore.abiUniswapRouter, this.owner);
        this.curveCRVPool = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressCurve3Pool, ValueStore_1.ValueStore.abiCurve3Pool, this.owner);
        this.curveOUSDPool = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressCurveOUSDPool, ValueStore_1.ValueStore.abiCurve3Pool, this.owner);
        this.factoryCurveMetapool = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressCurveFactory, ValueStore_1.ValueStore.abiCurveFactory, this.owner);
        if (createPool) {
            this.curveLvUSDPool = await this._createCurvePool("lvUSD3CRV", this.contracts.lvUSD.address);
        }
        else {
            this.curveLvUSDPool = await this.findPool(ValueStore_1.ValueStore.address3CRV, this.contracts.lvUSD.address);
            Logger_1.Logger.log("Found lvUSD/3CRV pool at address: " + this.curveLvUSDPool.address);
        }
        return this;
    }
    async exchangeEthForExactStable(amountOut, toAddress, stableAddress) {
        /// value here is max numbers of Eth to use. Putting some very large arbitrary number here is enough
        await this.uniRouter.swapETHForExactTokens(amountOut, [ValueStore_1.ValueStore.addressWETH9, stableAddress], toAddress, Pools.deadlineBlock, {
            value: hardhat_1.ethers.utils.parseUnits("100")
        });
    }
    async exchangeExactEthForStable(amountIn, toAddress, stableAddress) {
        await this.uniRouter.swapExactETHForTokens(0, [ValueStore_1.ValueStore.addressWETH9, stableAddress], toAddress, Pools.deadlineBlock, { value: amountIn });
    }
    /// Exchange ETH for USDT, then deposit USDT into 3CRV pool(different from lvUSD/3CRV pool!) to get 3CRV
    async exchangeExactEthFor3CRV(amountIn, toAddress) {
        await this.exchangeExactEthForStable(amountIn, toAddress, ValueStore_1.ValueStore.addressUSDT);
        const usdtBalance = await this.contracts.externalUSDT.balanceOf(toAddress);
        await EtherUtils_1.EtherUtils.mineBlock();
        await this.contracts.externalUSDT.approve(ValueStore_1.ValueStore.addressCurve3Pool, usdtBalance);
        await this.curveCRVPool.add_liquidity([0, 0, usdtBalance], 1);
        await EtherUtils_1.EtherUtils.mineBlock();
        const extraCRVCreated = await this.contracts.external3CRV.balanceOf(toAddress);
        await EtherUtils_1.EtherUtils.mineBlock();
        return NumberBundle_1.NumberBundle.withBn(extraCRVCreated);
    }
    async exchangeExactEthForOUSD(amountIn, toAddress) {
        // Firdt, get some 3crv 
        const crvBalance = await this.exchangeExactEthFor3CRV(amountIn, this.owner.address);
        await this.contracts.external3CRV.approve(this.curveOUSDPool.address, crvBalance.getBn());
        EtherUtils_1.EtherUtils.mineBlock();
        // Make exchange of 3crv for OUSD on OUSD/3CRV pool
        await this.curveOUSDPool.exchange(1, 0, crvBalance.getBn(), TestConstants_1.TestConstants.ONE_ETH.getBn());
        // Find how much was exchanged as OUSD to owner, transfer funds to toAddress
        const ousdBOwnerBalance = await ERC20Utils_1.ERC20Utils.balance(this.owner.address, this.contracts.externalOUSD);
        await this.contracts.externalOUSD.transfer(toAddress, ousdBOwnerBalance.getBn());
    }
    async addLiquidityToCurvePool(amountLvUSD, amount3CRV) {
        /// approve amount (would revert if not enough available on ERC20 balance)
        await this.contracts.lvUSD.approve(this.curveLvUSDPool.address, amountLvUSD.getBn());
        await this.contracts.external3CRV.approve(this.curveLvUSDPool.address, amount3CRV.getBn());
        await this.curveLvUSDPool.add_liquidity([amountLvUSD.getBn(), amount3CRV.getBn()], 1, this.owner.address);
        await EtherUtils_1.EtherUtils.mineBlock();
        Logger_1.Logger.log("lvUSD/3crv pool now has %s lvUSD, %s 3CRV", (await this.getLvUSDInPool()).getNum(), (await this.get3CRVInPool()).getNum());
    }
    async getLvUSDInPool() {
        return NumberBundle_1.NumberBundle.withBn(await this.curveLvUSDPool.balances(0));
    }
    async get3CRVInPool() {
        return NumberBundle_1.NumberBundle.withBn(await this.curveLvUSDPool.balances(1));
    }
    async _createCurvePool(poolName, tokenAddress) {
        const poolSymbol = poolName;
        const poolA = 40000;
        const poolFee = 4000000;
        await this.factoryCurveMetapool.deploy_metapool(ValueStore_1.ValueStore.addressCurve3Pool, poolName, poolSymbol, tokenAddress, poolA, poolFee);
        await EtherUtils_1.EtherUtils.mineBlock();
        // Find pool's address and return it
        const pool = await this.findPool(ValueStore_1.ValueStore.address3CRV, tokenAddress);
        Logger_1.Logger.log("Created Curve pool at address " + pool.address);
        // return await ethers.getContractAt(ValueStore.abi3PoolImplementation, poolAddress, this.owner);
        return pool;
    }
    async findPool(coin1Address, coin2Address) {
        const poolAddress = await this.factoryCurveMetapool.find_pool_for_coins(coin1Address, coin2Address);
        return await hardhat_1.ethers.getContractAt(ValueStore_1.ValueStore.abi3PoolImplementation, poolAddress, this.owner);
    }
}
exports.Pools = Pools;
Pools.deadlineBlock = 1670978314;
