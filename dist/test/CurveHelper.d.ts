declare const fundedPoolAmount: import("ethers").BigNumber;
/** Create a Curve Meta Pool that uses 3CRV
 * @param token: ERC20 token balanced in the pool
 * @param owner: Signer used to deploy / own the pool
 * returns address of the new pool
 */
declare function createMetapool(token: any, owner: any): Promise<any>;
/** Gets the Metapool by address
 * We use the 3CRV Base Pool, so we can assume the correct ABI as given in docs:
 * https://curve.readthedocs.io/factory-pools.html#implementation-contracts
 * @param address: address of the metapool
 * @param signer: signer used to interact with pool
 * Returns a 3CRVMetapool instance (Curve StableSwap Contract)
 */
declare function getMetapool(address: any, signer: any): Promise<import("ethers").Contract>;
/**  Adds liquidity to a Metapool
 * @param addressPool: address of the pool
 * @param amountToken1: amount (lvUSD)
 * @param amountToken2: amount (3crv)
 * @param owner: signer
 * @param r: instance: ContractContextTest
 */
declare function fundMetapool(addressPool: any, [amountLvUSD, amount3CRV]: [any, any], owner: any, r: any, skipPoolBalances?: boolean): Promise<void>;
/**  Creates & Funds a LvUSD/3CRV Metapool
 * funds pools with "fundedPoolAmount" LvUSD & 3CRV
 * @param owner: signer
 * @param r: instance: ContractContextTest
 */
declare function createAndFundMetapool(owner: any, r: any, skipPoolBalances?: boolean): Promise<import("ethers").Contract>;
declare function exchangeLvUSDfor3CRV(amountLvUSD: any, owner: any): boolean;
declare function exchange3CRVfor3LvUSD(amountLvUSD: any, owner: any): boolean;
export { createMetapool, getMetapool, fundMetapool, createAndFundMetapool, exchangeLvUSDfor3CRV, exchange3CRVfor3LvUSD, fundedPoolAmount, };
