"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Signers_1 = require("./Signers");
const Contracts_1 = require("./Contracts");
const Pools_1 = require("./Pools");
const Logger_1 = require("./Logger");
const NumberBundle_1 = require("./NumberBundle");
const LeverageHelper_1 = require("./LeverageHelper");
const EtherUtils_1 = require("./EtherUtils");
const DeploymentUtils_1 = require("./DeploymentUtils");
const TestConstants_1 = require("./TestConstants");
const PositionManager_1 = require("./PositionManager");
const lvUSDMinted = NumberBundle_1.NumberBundle.withNum(1000);
const crvInPool = NumberBundle_1.NumberBundle.withNum(1000);
const fundPool = true;
const CREATE_POOL = true;
/// test class 
async function main() {
    // Logger.setVerbose(true);
    // TODO: Might want to add reset to default block
    const signers = await new Signers_1.Signers().init();
    const contracts = await new Contracts_1.Contracts().init(signers);
    const pools = await new Pools_1.Pools().init(contracts, CREATE_POOL);
    const leverageHelper = await new LeverageHelper_1.LeverageHelper(contracts);
    const positionManager = await new PositionManager_1.PositionManager(contracts, pools);
    /// get LvUSD and 3CRV to fund 3crv/lvUSD pool
    if (fundPool === true) {
        // Mint LvUSD and get balance
        await leverageHelper.mintLvUSD(TestConstants_1.TestConstants.ONE_THOUSAND_ETH, signers.owner.address);
        const ownerLvUSD = await leverageHelper.getLvUSDBalance(signers.owner.address);
        // exchange eth for 3CRV
        const amount3CRV = await pools.exchangeExactEthFor3CRV(TestConstants_1.TestConstants.ONE_ETH.getBn(), signers.owner.address);
        // add liquidity to lvUSD/3crv pool
        await pools.addLiquidityToCurvePool(ownerLvUSD, amount3CRV);
    }
    await DeploymentUtils_1.DeploymentUtils.basicSetup(contracts, pools);
    /// Non deployment related setup to set up the stage for sanity check of opening position
    // Setup auction
    const auctionInfo = new LeverageHelper_1.AuctionInfo();
    await leverageHelper.startAuctionAndMintAndAcceptLeverage(auctionInfo);
    await positionManager.fundSignerForPosition(signers.c1, leverageHelper);
    Logger_1.Logger.setVerbose(true);
    const position = await PositionManager_1.PositionInfo.build(contracts, signers.c1, NumberBundle_1.NumberBundle.withNum(100), 5);
    await positionManager.approveForPositionCreation(position);
    await positionManager.createPosition(position);
    await position.printPositionInfo();
    await position.fillPositionPostCreation();
    await position.printPositionInfo();
    //mine block once setup is done
    await EtherUtils_1.EtherUtils.mineBlock();
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
