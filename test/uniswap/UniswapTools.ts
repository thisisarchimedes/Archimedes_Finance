import { ethers } from "hardhat"; // del
import {
    Contract,
    Signer,
} from "ethers";
import {
    factoryABI,
    poolABI,
    lpTokenABI,
    routerABI,
} from "./UniswapABIs";
import {
    findEvent,
    ethNumToWeiBn,
    weiBnToEthNum,
} from "../helpers";
import { ITransactionResponse } from "../interfaces/EthersInterfaces";
import { ISignerWithAddress } from "../interfaces/HardHatInterfaces";

// Uniswap Contract Addresses
const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // UniswapV2Factory
const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // UniswapV2Router02
// ERC20 Token Contract Addresses
const weth9Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
// Zero Address
const zeroAddress = "0x0000000000000000000000000000000000000000";
// Useful Default Values
const tokenTinyValue = 0.000001;
const etherTinyValue = 0.000001;
const endOfTime = 99999999999;

// Returns a new instance of the Uniswap Factory contract
// Factory is useful for creating and deploying new asset pairs
function getFactory (signer: Signer): Contract {
    return new Contract(factoryAddress, factoryABI, signer);
}

// Returns a new instance of the Uniswap Router contract
// Router is useful for interacting with existing pairs
function getRouter (signer: Signer): Contract {
    return new Contract(routerAddress, routerABI, signer);
}

// Deploys a new pair (pool and lp token contract) on Uniswap using Uniswap Factory
// then returns an instance of the lp token contract
async function createPair (
    tokenAddressA: string,
    tokenAddressB: string,
    factory: Contract,
    signer: Signer,
): Promise<Contract> {
    // Create Pair Contract from Factory
    const txResponse: ITransactionResponse = await factory.createPair(tokenAddressA, tokenAddressB);
    // Get address of new LP Token from PairCreated event
    const createPairEvent = await findEvent("PairCreated", txResponse);
    if (createPairEvent === undefined) {
        throw new Error("Event not found");
    }
    const lpTokenAddress: string = createPairEvent.args.pair;
    // Deliver instance of pair contract
    return new Contract(lpTokenAddress, lpTokenABI, signer);
}

// Wrapper function for createPair using Weth9 as one of the tokens
// Effectively creates an eth pair
async function createEthPair (
    tokenAddress: string,
    factory: Contract,
    signer: Signer,
): Promise<Contract> {
    return await createPair(tokenAddress, weth9Address, factory, signer);
}

// Get instance of pool contract of existing pair
// Throws error if pair does not exist
async function getPool (
    tokenAddressA: string,
    tokenAddressB: string,
    factory: Contract,
    signer: Signer,
): Promise<Contract> {
    // Get pool address from Factory
    const poolAddress = await factory.getPair(tokenAddressA, tokenAddressB);
    if (poolAddress === zeroAddress) {
        throw new Error("Pair does not exist");
    }
    // Return pool contract instance
    return new Contract(poolAddress, poolABI, signer);
}

// Wrapper function for getPool using Weth9 as one of the tokens
// Effectively finds an eth pool
async function getEthPool (
    tokenAddress: string,
    factory: Contract,
    signer: Signer,
): Promise<Contract> {
    return await getPool(tokenAddress, weth9Address, factory, signer);
}

// Get reserve amount for each token in pool
async function getReserves (pool: Contract): Promise<[ number, number ]> {
    const [ reserve0, reserve1 ] = await pool.getReserves();
    return [ weiBnToEthNum(reserve0), weiBnToEthNum(reserve1) ];
}

// Adds token and eth liquidity to a token and eth pair
async function addLiquidityToEthPair (
    amountTokenDesired: number,
    amountETHDesired: number,
    amountTokenMin: number,
    amountETHMin: number,
    deadline: number,
    token: Contract,
    router: Contract,
    signer: ISignerWithAddress,
) {
    // Signer approves token transferFrom by Uniswap
    await token.connect(signer).approve(router.address, ethNumToWeiBn(amountTokenDesired));
    // Add liquidity to pair through router
    await router.addLiquidityETH(
        token.address,
        ethNumToWeiBn(amountTokenDesired),
        ethNumToWeiBn(amountTokenMin),
        ethNumToWeiBn(amountETHMin),
        signer.address,
        deadline,
        { value: ethNumToWeiBn(amountETHDesired) },
    );
}

// Creates a liquidity pool on Uniswap
// Returns instance of pool contract and lp token contract
async function createEthPairPool (
    token: Contract,
    tokenLiquidity: number,
    ethLiquidity: number,
    signer: ISignerWithAddress,
    tokenLiquidityMin = tokenTinyValue,
    ethLiquidityMin = etherTinyValue,
    deadline = endOfTime,
): Promise<[ Contract, Contract ]> {
    // Get factory and router instances
    const factory = await getFactory(signer);
    const router = await getRouter(signer);
    // Create new token pair against eth
    const lpToken = await createEthPair(token.address, factory, signer);
    // Add liquidity to new token pair
    await addLiquidityToEthPair(
        tokenLiquidity, ethLiquidity,
        tokenLiquidityMin, ethLiquidityMin,
        deadline, token,
        router, signer,
    );
    // Get pool instance of new pair
    const pool = await getEthPool(token.address, factory, signer);
    // Give back address of new liquidity pool
    return [ pool, lpToken ];
}

export {
    createEthPairPool,
    getReserves,
};
