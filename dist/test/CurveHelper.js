"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fundedPoolAmount = exports.exchange3CRVfor3LvUSD = exports.exchangeLvUSDfor3CRV = exports.createAndFundMetapool = exports.fundMetapool = exports.getMetapool = exports.createMetapool = void 0;
const hardhat_1 = require("hardhat");
const ABIs_1 = require("./ABIs");
const MainnetHelper_1 = require("./MainnetHelper");
// Hard-coded amount we use to fund the pool with
const fundedPoolAmount = hardhat_1.ethers.utils.parseUnits("20000.0");
exports.fundedPoolAmount = fundedPoolAmount;
/** Create a Curve Meta Pool that uses 3CRV
 * @param token: ERC20 token balanced in the pool
 * @param owner: Signer used to deploy / own the pool
 * returns address of the new pool
 */
async function createMetapool(token, owner) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore CurvePool Factory
    const factoryCurveMetapool = new hardhat_1.ethers.Contract(MainnetHelper_1.addressCurveFactory, ABIs_1.abiCurveFactory, owner);
    const tokenName = await token.symbol();
    const poolSymbol = tokenName + "3CRV";
    const poolA = 40000;
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
    await factoryCurveMetapool.deploy_metapool(MainnetHelper_1.addressCurve3Pool, tokenName, poolSymbol, token.address, poolA, poolFee);
    // https://curve.readthedocs.io/factory-deployer.html#Factory.find_pool_for_coins
    // We deployed a 3CRV/lvUSD pool - so we ask Curve Factory to look for pools that can deal with USDT/lvUSD
    // In the future this will be a fixed index we can query instead
    const poolAddress = await factoryCurveMetapool.find_pool_for_coins(MainnetHelper_1.address3CRV, token.address);
    // console.log("findPoolForCoins - %s", poolAddress);
    // Return the pool address
    return poolAddress;
}
exports.createMetapool = createMetapool;
/** Gets the Metapool by address
 * We use the 3CRV Base Pool, so we can assume the correct ABI as given in docs:
 * https://curve.readthedocs.io/factory-pools.html#implementation-contracts
 * @param address: address of the metapool
 * @param signer: signer used to interact with pool
 * Returns a 3CRVMetapool instance (Curve StableSwap Contract)
 */
async function getMetapool(address, signer) {
    // We assume its a 3CRV metapool, so we use the 3pool implementation abi
    return await hardhat_1.ethers.getContractAt(ABIs_1.abi3PoolImplementation, address, signer);
}
exports.getMetapool = getMetapool;
/**  Adds liquidity to a Metapool
 * @param addressPool: address of the pool
 * @param amountToken1: amount (lvUSD)
 * @param amountToken2: amount (3crv)
 * @param owner: signer
 * @param r: instance: ContractContextTest
 */
async function fundMetapool(addressPool, [amountLvUSD, amount3CRV], owner, r, skipPoolBalances = false) {
    const token3CRV = r.external3CRV;
    const lvUSD = r.lvUSD;
    await token3CRV.approve(addressPool, amount3CRV);
    await lvUSD.approve(addressPool, amountLvUSD);
    const pool = await getMetapool(addressPool, owner);
    let balanceLvUSD = 0;
    let balance3CRV = 0;
    if (skipPoolBalances === false) {
        balanceLvUSD = await pool.balances(0);
        balance3CRV = await pool.balances(1);
    }
    // if the pool is NOT empty we calculate expected amount of minted LP
    if (balanceLvUSD > 0 && balance3CRV > 0) {
        // https://curve.readthedocs.io/factory-pools.html#getting-pool-info
        const calc = await pool.calc_token_amount([amountLvUSD, amount3CRV], true);
        // allows for 1% slippage by requiring only 99%
        const onePercent = calc.div(100);
        const expected = calc.sub(onePercent);
        await pool.add_liquidity([amountLvUSD, amount3CRV], expected, owner.address);
    }
    else {
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
exports.fundMetapool = fundMetapool;
/**  Creates & Funds a LvUSD/3CRV Metapool
 * funds pools with "fundedPoolAmount" LvUSD & 3CRV
 * @param owner: signer
 * @param r: instance: ContractContextTest
 */
async function createAndFundMetapool(owner, r, skipPoolBalances = false) {
    const lvUSD = r.lvUSD;
    const addressPool = await createMetapool(lvUSD, owner);
    const pool = await getMetapool(addressPool, owner);
    // Should not be able to call this multiple times
    // Check to make sure pool is empty
    let poolCoin0Bal = "0.0";
    let poolCoin1Bal = "0.0";
    if (skipPoolBalances === false) {
        poolCoin0Bal = hardhat_1.ethers.utils.formatUnits(await pool.connect(owner).balances(0));
        poolCoin1Bal = hardhat_1.ethers.utils.formatUnits(await pool.connect(owner).balances(1));
    }
    if (poolCoin0Bal === "0.0" && poolCoin1Bal === "0.0") {
        await fundMetapool(addressPool, [fundedPoolAmount, fundedPoolAmount], owner, r, skipPoolBalances);
        return pool;
    }
    else {
        throw new Error("Pool already created at [" + addressPool + "]. Use fundMetapool() instead.");
    }
}
exports.createAndFundMetapool = createAndFundMetapool;
// Swap LvUSD for 3CRV using the Metapool
// TODO
function exchangeLvUSDfor3CRV(amountLvUSD, owner) {
    return true;
}
exports.exchangeLvUSDfor3CRV = exchangeLvUSDfor3CRV;
// Swap 3CRV for LvUSD using the Metapool
// TODO
function exchange3CRVfor3LvUSD(amountLvUSD, owner) {
    return true;
}
exports.exchange3CRVfor3LvUSD = exchange3CRVfor3LvUSD;
