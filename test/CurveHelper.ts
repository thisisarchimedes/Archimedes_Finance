import { ethers } from "hardhat";
import {
    abiCurveFactory,
    abi3PoolImplementation,
} from "./ABIs";
import {
    addressCurveFactory,
    address3CRV,
    addressCurve3Pool,
} from "./MainnetHelper";

/** Create a Curve Meta Pool that uses 3CRV
* @param token: ERC20 token balanced in the pool
* @param owner: Signer used to deploy / own the pool
* returns address of the new pool
*/
async function createMetapool (token, owner) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore CurvePool Factory
    const factoryCurveMetapool = new ethers.Contract(addressCurveFactory, abiCurveFactory, owner);
    const tokenName = await token.symbol();
    const poolSymbol = tokenName + "3CRV";
    const poolA = 1337;
    const poolFee = 4000000;

    // examples on Mainnet:
    // https://etherscan.io/address/0xB9fC157394Af804a3578134A6585C0dc9cc990d4?method=Deploy_metapool~de7fe3bf
    // https://curve.readthedocs.io/factory-deployer.html#Factory.deploy_metapool
    /**
    * @param _base_pool: Address of the base pool to use within the new metapool.
    * @param _name: Name of the new metapool.
    * @param _symbol: Symbol for the new metapool’s LP token. This value will be concatenated with the base pool symbol.
    * @param _coin: Address of the coin being used in the metapool
    * @param _A: Amplification coefficient
    * @param _fee: Trade fee, given as an integer with 1e10 precision.
    */
    await factoryCurveMetapool.deploy_metapool(addressCurve3Pool, tokenName, poolSymbol, token.address, poolA, poolFee);
    // https://curve.readthedocs.io/factory-deployer.html#Factory.find_pool_for_coins
    // We deployed a 3CRV/lvUSD pool - so we ask Curve Factory to look for pools that can deal with USDT/lvUSD
    // In the future this will be a fixed index we can query instead
    const poolAddress = await factoryCurveMetapool.find_pool_for_coins(address3CRV, token.address);
    // Return the pool address
    return poolAddress;
}

/** Gets the Metapool by address
* We use the 3CRV Base Pool, so we can assume the correct ABI as given in docs:
* https://curve.readthedocs.io/factory-pools.html#implementation-contracts
* @param address: address of the metapool
* @param signer: signer used to interact with pool
* Returns a 3CRVMetapool instance (Curve StableSwap Contract)
*/
async function getMetapool (address, signer) {
    // We assume its a 3CRV metapool, so we use the 3pool implementation abi
    return await ethers.getContractAt(abi3PoolImplementation, address, signer);
}

/**  Adds liquidity to a Metapool
 * @param addressPool: address of the pool
 * @param amountToken1: amount (lvUSD)
 * @param amountToken2: amount (3crv)
 * @param owner: signer
 * @param r: instance: ContractContextTest
 */
async function fundMetapool (addressPool, [amountLvUSD, amount3CRV], owner, r) {
    const token3CRV = r.external3CRV;
    const lvUSD = r.lvUSD;
    await token3CRV.approve(addressPool, amount3CRV);
    await lvUSD.approve(addressPool, amountLvUSD);
    const pool = await getMetapool(addressPool, owner);
    let balanceLvUSD = await pool.balances(0, {
        gasLimit: 3000000,
    });
    let balance3CRV = await pool.balances(1, {
        gasLimit: 3000000,
    });
    // if the pool is NOT empty we calculated expected amount of minted LP
    if (balanceLvUSD > 0 && balance3CRV > 0) {
        // https://curve.readthedocs.io/factory-pools.html#getting-pool-info
        const calc = await pool.calc_token_amount([amountLvUSD, amount3CRV], true);

        // allows for 1% slippage by requiring only 99%
        const onePercent = calc.div(100);
        const expected = calc.sub(onePercent);
        await pool.add_liquidity([amountLvUSD, amount3CRV], expected, owner.address);
    } else {
        // otherwise, its a brand new empty pool so we deposit directly
        await pool.add_liquidity([amountLvUSD, amount3CRV], 1, owner.address);
    }
    balanceLvUSD = await pool.balances(0, {
        gasLimit: 3000000,
    });
    balance3CRV = await pool.balances(1, {
        gasLimit: 3000000,
    });
}

/**  Creates & Funds a LvUSD/3CRV Metapool
 * funds pool with 200 LvUSD & 200 3CRV
 * @param owner: signer
 * @param r: instance: ContractContextTest
 */
async function createAndFundMetapool (owner, r) {
    const lvUSD = r.lvUSD;
    const addressPool = await createMetapool(lvUSD, owner);
    await fundMetapool(addressPool, [ethers.utils.parseEther("200.0"), ethers.utils.parseEther("200.0")], owner, r);
    const pool = await getMetapool(addressPool, owner);
    return pool;
}

// Swap LvUSD for 3CRV using the Metapool
// TODO
function exchangeLvUSDfor3CRV (amountLvUSD, owner) { return true; }

// Swap 3CRV for LvUSD using the Metapool
// TODO
function exchange3CRVfor3LvUSD (amountLvUSD, owner) { return true; }

export {
    /* helper functions */
    createMetapool,
    getMetapool,
    fundMetapool,
    createAndFundMetapool,
    exchangeLvUSDfor3CRV,
    exchange3CRVfor3LvUSD,
};
