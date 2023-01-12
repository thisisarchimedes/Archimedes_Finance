import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { Contract } from "@nomiclabs/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import { Signers } from "./Signers";
import { Contracts } from "./Contracts";
import { Pools } from "./Pools";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { LeverageHelper, AuctionInfo } from "./LeverageHelper";
import { EtherUtils } from "./EtherUtils";
import { ValueStore } from "./ValueStore";
import { DeploymentUtils } from "./DeploymentUtils";
import { TestConstants } from "./TestConstants";
import { Test } from "mocha";
import { PositionManager } from "./PositionManager";

const lvUSDMinted = NumberBundle.withNum(1000);
const crvInPool = NumberBundle.withNum(1000);
const fundPool = true;
const CREATE_POOL = true;
/// test class 
async function main() {
    Logger.setVerbose(true);
    // TODO: Might want to add reset to default block

    const signers = await new Signers().init();
    const contracts = await new Contracts().init(signers);
    const pools = await new Pools().init(contracts, CREATE_POOL);
    const leverageHelper = await new LeverageHelper(contracts);
    const positionManager = await new PositionManager(contracts, pools);

    /// get LvUSD and 3CRV to fund 3crv/lvUSD pool
    if (fundPool === true) {
        // Mint LvUSD and get balance
        await leverageHelper.mintLvUSD(lvUSDMinted, signers.owner.address);
        const ownerLvUSD = await leverageHelper.getLvUSDBalance(signers.owner.address);
        // exchange eth for 3CRV
        const amount3CRV = await pools.exchangeExactEthFor3CRV(ValueStore.ONE_ETH, signers.owner.address);
        // add liquidity to lvUSD/3crv pool
        await pools.addLiquidityToCurvePool(ownerLvUSD, amount3CRV);
    }

    await DeploymentUtils.basicSetup(contracts, pools);

    /// Non deployment related setup to set up the stage for sanity check of opening position
    // Setup auction
    const auctionInfo = new AuctionInfo();
    await leverageHelper.startAuctionAndMintAndAcceptLeverage(auctionInfo);

    await positionManager.fundSignerForPosition(signers.c1, leverageHelper);
    //mine block once setup is done
    await EtherUtils.mineBlock();
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});