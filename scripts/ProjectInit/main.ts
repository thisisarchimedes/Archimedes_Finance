import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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
import { PositionInfo } from "./PositionInfo";
import { GeneralStateUtils } from "./GeneralStateUtils";
import { ParamStoreHelper } from "./ParamStoreHelper";

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
    const paramStoreHelper = await new ParamStoreHelper(contracts);

    /// get LvUSD and 3CRV to fund 3crv/lvUSD pool
    if (fundPool === true) {
        // Mint LvUSD and get balance
        await leverageHelper.mintLvUSD(TestConstants.ONE_THOUSAND_ETH, signers.owner.address);
        const ownerLvUSD = await leverageHelper.getLvUSDBalance(signers.owner.address);
        // exchange eth for 3CRV
        const amount3CRV = await pools.exchangeExactEthFor3CRV(TestConstants.ONE_ETH.getBn(), signers.owner.address);
        // add liquidity to lvUSD/3crv pool

        await pools.addLiquidityToCurvePool(ownerLvUSD, amount3CRV);
    }

    await DeploymentUtils.basicSetup(contracts, pools);

    /// Non deployment related setup to set up the stage for sanity check of opening position
    // Setup auction
    const auctionInfo = new AuctionInfo();
    await leverageHelper.startAuctionAndMintAndAcceptLeverage(auctionInfo);


    // fund user and create position
    await positionManager.fundSignerForPosition(signers.c1, leverageHelper);

    Logger.setVerbose(true);
    paramStoreHelper.setOriginationFee(NumberBundle.withNum(0.00005));
    console.log("Curve exchange rate:  exchanging 1 lvUSD gets us %s 3crv" + (await pools.estimatelvUSDtoCrvExchange(TestConstants.ONE_ETH)).getNum());
    console.log("Curve exchange rate:  exchanging 1 CRV gets us %s OUSD" + (await pools.estimateCrvToOusdExchange(TestConstants.ONE_ETH)).getNum());

    const position = await PositionInfo.build(contracts, signers.c1, NumberBundle.withNum(100), 5)


    await GeneralStateUtils.printUserBalances(contracts, signers.c1, "Before creating position");

    await positionManager.createPositionEndToEnd(position, true)

    // print state after creating position
    await GeneralStateUtils.printArchimedesBalances(contracts, "After creating position");
    await GeneralStateUtils.printUserBalances(contracts, signers.c1, "After creating position");

    // unwind position
    await positionManager.unwindPosition(position);
    await GeneralStateUtils.printArchimedesBalances(contracts, "After unwinding position");
    await GeneralStateUtils.printUserBalances(contracts, signers.c1, "After unwinding position");

    await position.printPositionInfo();

    // print state after unwinding position
    //mine block once setup is done
    await EtherUtils.mineBlock();
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});