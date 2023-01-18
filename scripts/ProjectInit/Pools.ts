import { ContractAddressOrInstance } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { Contracts } from "./Contracts";
import { IUniswapV2Router02 } from "../../types/contracts/interfaces/IUniswapV2Router02";
import { ValueStore } from "./ValueStore";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/IERC20";
import { ICurveFiCurveInterface } from "../../types/contracts/interfaces/ICurveFi/ICurveFiCurve";
import { EtherUtils } from "./EtherUtils";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { signers } from "../../test/ContractTestContext";
import { ERC20Utils } from "./ERC20Utils";
import { TestConstants } from "./TestConstants";


export class Pools {
    contracts: Contracts;
    owner: SignerWithAddress

    uniRouter: IUniswapV2Router02;
    curveLvUSDPool: Contract;
    curveCRVPool: Contract;
    curveOUSDPool: Contract;
    factoryCurveMetapool: Contract

    static deadlineBlock = 1670978314;

    async init(contracts: Contracts, createPool: bool = false): Pools {
        this.contracts = contracts;
        this.owner = contracts.signers.owner;
        this.uniRouter = new ethers.Contract(ValueStore.addressUniswapRouter, ValueStore.abiUniswapRouter, this.owner);
        this.curveCRVPool = new ethers.Contract(ValueStore.addressCurve3Pool, ValueStore.abiCurve3Pool, this.owner);
        this.curveOUSDPool = new ethers.Contract(ValueStore.addressCurveOUSDPool, ValueStore.abiCurve3Pool, this.owner);
        this.factoryCurveMetapool = new ethers.Contract(ValueStore.addressCurveFactory, ValueStore.abiCurveFactory, this.owner);

        if (createPool) {
            this.curveLvUSDPool = await this._createCurvePool("lvUSD3CRV", this.contracts.lvUSD.address);
            Logger.log("Created lvUSD curve pools at : " + this.curveLvUSDPool.address);
        } else {
            this.curveLvUSDPool = await this.findPool(ValueStore.address3CRV, this.contracts.lvUSD.address);
            Logger.log("Found lvUSD/3CRV pool at address: " + this.curveLvUSDPool.address);
        }
        return this;
    }

    async exchangeEthForExactStable(amountOut: BigNumber, toAddress: String, stableAddress: String): void {
        /// value here is max numbers of Eth to use. Putting some very large arbitrary number here is enough
        await this.uniRouter.swapETHForExactTokens(amountOut, [ValueStore.addressWETH9, stableAddress], toAddress, Pools.deadlineBlock, {
            value: ethers.utils.parseUnits("100")
        })
    }

    async exchangeExactEthForStable(amountIn: BigNumber, toAddress: String, stableAddress: String): void {
        await this.uniRouter.swapExactETHForTokens(0, [ValueStore.addressWETH9, stableAddress], toAddress, Pools.deadlineBlock,
            { value: amountIn }
        );
    }

    /// Exchange ETH for USDT, then deposit USDT into 3CRV pool(different from lvUSD/3CRV pool!) to get 3CRV
    async exchangeExactEthFor3CRV(amountIn: BigNumber, toAddress: String): NumberBundle {
        await this.exchangeExactEthForStable(amountIn, toAddress, ValueStore.addressUSDT);
        const usdtBalance = await this.contracts.externalUSDT.balanceOf(toAddress);
        await EtherUtils.mineBlock();
        await this.contracts.externalUSDT.approve(ValueStore.addressCurve3Pool, usdtBalance);
        await this.curveCRVPool.add_liquidity([0, 0, usdtBalance], 1);
        await EtherUtils.mineBlock();
        const extraCRVCreated = await this.contracts.external3CRV.balanceOf(toAddress);
        await EtherUtils.mineBlock();
        return NumberBundle.withBn(extraCRVCreated);
    }

    async exchangeExactEthForOUSD(amountIn: BigNumber, toAddress: String): void {
        // Firdt, get some 3crv 
        const crvBalance = await this.exchangeExactEthFor3CRV(amountIn, this.owner.address);
        await this.contracts.external3CRV.approve(this.curveOUSDPool.address, crvBalance.getBn());
        EtherUtils.mineBlock();

        // Make exchange of 3crv for OUSD on OUSD/3CRV pool
        await this.curveOUSDPool.exchange(1, 0, crvBalance.getBn(), TestConstants.ONE_ETH.getBn());

        // Find how much was exchanged as OUSD to owner, transfer funds to toAddress
        const ousdBOwnerBalance = await ERC20Utils.balance(this.owner.address, this.contracts.externalOUSD);
        await this.contracts.externalOUSD.transfer(toAddress, ousdBOwnerBalance.getBn());
    }

    async addLiquidityToCurvePool(amountLvUSD: NumberBundle, amount3CRV: NumberBundle): void {
        /// approve amount (would revert if not enough available on ERC20 balance)
        await this.contracts.lvUSD.approve(this.curveLvUSDPool.address, amountLvUSD.getBn());
        await this.contracts.external3CRV.approve(this.curveLvUSDPool.address, amount3CRV.getBn());
        console.log("Before add liq")

        await this.curveLvUSDPool.add_liquidity([amountLvUSD.getBn(), amount3CRV.getBn()], 1, this.owner.address);
        console.log("Before add liq")

        await EtherUtils.mineBlock();
        Logger.log("lvUSD/3crv pool now has %s lvUSD, %s 3CRV", (await this.getLvUSDInPool()).getNum(), (await this.get3CRVInPool()).getNum());
    }

    async getLvUSDInPool(): NumberBundle {
        return NumberBundle.withBn(await this.curveLvUSDPool.balances(0));
    }

    async get3CRVInPool(): NumberBundle {
        return NumberBundle.withBn(await this.curveLvUSDPool.balances(1));
    }

    async _createCurvePool(poolName: String, tokenAddress: String): Contract {
        const poolSymbol = poolName;
        const poolA = 40000;
        const poolFee = 4000000;

        await this.factoryCurveMetapool.deploy_metapool(ValueStore.addressCurve3Pool, poolName, poolSymbol, tokenAddress, poolA, poolFee);
        await EtherUtils.mineBlock();
        // Find pool's address and return it
        const pool = await this.findPool(ValueStore.address3CRV, tokenAddress);
        return pool;
    }

    async findPool(coin1Address: String, coin2Address: String): Contract {
        const poolAddress = await this.factoryCurveMetapool.find_pool_for_coins(coin1Address, coin2Address);
        return await ethers.getContractAt(ValueStore.abi3PoolImplementation, poolAddress, this.owner);
    }

    /// For lvUSD/3CRV pool, coin 0 is lvUSD, coin 1 is 3crv

    async estimatelvUSDtoCrvExchange(lvUSDAmountIn: NumberBundle): NumberBundle {
        return await this.estimateCurveExchange(lvUSDAmountIn, 0, 1);
        // const lvUSDAmountBn = lvUSDAmount.getBn();
        // const ousdAmount = await this.curveLvUSDPool.get_dy(0, 1, lvUSDAmountBn);
        // console.log("Got % OUSD from % lvUSD", NumberBundle.withBn(ousdAmount).getNum(), lvUSDAmount.getNum())
        // return NumberBundle.withBn(ousdAmount);
    }

    async estimateCrvToOusdExchange(crvAmountIn: NumberBundle): NumberBundle {
        return await this.estimateCurveExchange(crvAmountIn, 1, 0);
    }

    async estimateCurveExchange(amountIn: NumberBundle, fromCoin: number, toCoin: number): NumberBundle {
        const amountInBn = amountIn.getBn();
        const amountOut = await this.curveLvUSDPool.get_dy(fromCoin, toCoin, amountInBn);

        return NumberBundle.withBn(amountOut);
    }


}