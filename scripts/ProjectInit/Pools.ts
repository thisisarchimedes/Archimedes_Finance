import { ContractAddressOrInstance } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { Contracts } from "./contracts";
import { IUniswapV2Router02 } from "../../types/contracts/interfaces/IUniswapV2Router02";
import { ValueStore } from "./ValueStore";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/IERC20";
import { ICurveFiCurveInterface } from "../../types/contracts/interfaces/ICurveFi/ICurveFiCurve";
import { EtherUtils } from "./EtherUtils";


export class Pools {
    contracts: Contracts;
    owner: SignerWithAddress

    uniRouter: IUniswapV2Router02;
    curveLvUSDPool: ICurveFiCurveInterface;
    curveCRVPool: Contract;

    static deadlineBlock = 1670978314;

    async init(contracts: Contracts): Pools {
        this.contracts = contracts;
        this.owner = contracts.signers.owner;
        this.uniRouter = new ethers.Contract(ValueStore.addressUniswapRouter, ValueStore.abiUniswapRouter, this.owner);
        this.curveCRVPool = new ethers.Contract(ValueStore.addressCurve3Pool, ValueStore.abiCurve3Pool, this.owner);
        this.curveLvUSDPool = await this._createCurvePool("lvUSD3CRV", this.contracts.lvUSD.address);
        return this;
    }

    async exchangeEthForExactStable(amountOut: BigNumber, toAddress: String, stableAddress: String): void {
        await this.uniRouter.swapETHForExactTokens(amountOut, [ValueStore.addressWETH9, stableAddress], toAddress, Pools.deadlineBlock, {
            value: ethers.utils.parseUnits("100")
        })
    }

    async exchangeEthForExact3CRV(amountOut: BigNumber, toAddress: String): void {
        const bufferAmountOut = amountOut.mul(2);
        const usdtBalanceBefore = await this.contracts.externalUSDT.balanceOf(toAddress);
        this.exchangeEthForExactStable(bufferAmountOut, toAddress, ValueStore.addressUSDT);

        await this.contracts.externalUSDT.approve(ValueStore.addressCurve3Pool, bufferAmountOut);
        await this.curveCRVPool.add_liquidity([0, 0, bufferAmountOut], 1);
        await EtherUtils.mineBlock();
        const extraCRVCreated = (await this.contracts.external3CRV.balanceOf(toAddress)).sub(usdtBalanceBefore).sub(amountOut);
        await this.contracts.external3CRV.transfer(this.contracts.signers.dump.address, extraCRVCreated);
        await EtherUtils.mineBlock();
    }

    async _createCurvePool(poolName: String, tokenAddress: String): ICurveFiCurveInterface {
        const factoryCurveMetapool = new ethers.Contract(ValueStore.addressCurveFactory, ValueStore.abiCurveFactory, this.owner);

        const poolSymbol = poolName;
        const poolA = 40000;
        const poolFee = 4000000;

        await factoryCurveMetapool.deploy_metapool(ValueStore.addressCurve3Pool, poolName, poolSymbol, tokenAddress, poolA, poolFee);
        await EtherUtils.mineBlock();
        // await ethers.network.provider.send("evm_mine");
        // Find pools address and return it
        const poolAddress = await factoryCurveMetapool.find_pool_for_coins(ValueStore.address3CRV, tokenAddress);
        return await ethers.getContractAt(ValueStore.abi3PoolImplementation, poolAddress, this.owner);
    }

    async addLiquidityToCurvePool(amountLvUSD: BigNumber, amount): void {

    }

}