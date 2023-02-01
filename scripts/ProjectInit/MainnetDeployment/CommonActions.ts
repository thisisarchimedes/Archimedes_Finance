import { Contracts } from "../Contracts";
import { LeverageHelper } from "../LeverageHelper";
import { Pools } from "../Pools";
import { TestConstants } from "../TestConstants";

export async function fundCurvePool (contracts: Contracts, pools: Pools) {
    // Mint LvUSD and get balance
    const leverageHelper = new LeverageHelper(contracts);
    await leverageHelper.mintLvUSD(TestConstants.ONE_THOUSAND_ETH, contracts.signers.owner.address);
    const ownerLvUSD = await leverageHelper.getLvUSDBalance(contracts.signers.owner.address);
    // exchange eth for 3CRV
    const amount3CRV = await pools.exchangeExactEthFor3CRV(TestConstants.ONE_ETH.getBn(), contracts.signers.owner.address);
    // add liquidity to lvUSD/3crv pool
    await pools.addLiquidityToCurvePool(TestConstants.ONE_THOUSAND_ETH, amount3CRV);
}
