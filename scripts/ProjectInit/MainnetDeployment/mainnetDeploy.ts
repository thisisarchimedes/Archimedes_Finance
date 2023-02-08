import { Contracts } from "../Contracts";
import { DeploymentUtils } from "../DeploymentUtils";
import { ERC20Utils } from "../ERC20Utils";
import { AuctionInfo, LeverageHelper } from "../LeverageHelper";
import { Logger } from "../Logger";
import { NumberBundle } from "../NumberBundle";
import { Pools } from "../Pools";
import { Signers } from "../Signers";
import { fundCurvePool } from "./CommonActions";
import { DeployedStore } from "./DeployedStore";
import { deployOrGetAllContracts, verifyArcimedesEngine } from "./Helpers";

// console.log("Should we deploy tokens? ", options.deploytokens);

/// We would probably change this to command line arguments later but for now
/// Should deploy block
// const deployJustTokens = true;
// const deployArchimedesEngine = true;
// const deployVault = true;
// const shouldCreatePool = true;
// const shouldDoBasicSetup = true;

const deployJustTokens = false;
const deployArchimedesEngine = false;
const deployVault = false;

const shouldCreatePool = false;
const shouldAddLiqToPool = false;
const shouldDoBasicSetup = false;

const shouldCreateAuction = false;
const shouldVerifyArchimedesEngine = false;

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6"

async function main() {
    Logger.setVerbose(true);
    const signers = await new Signers().initOwnerOnly();
    const contracts = new Contracts(signers);
    await deployOrGetAllContracts(contracts, deployJustTokens, deployArchimedesEngine, deployVault);
    const pools = await new Pools().init(contracts, shouldCreatePool);

    console.log("\nDone with deploying/get instances the whole of archimedes. Now setting up basic stuff if needed");

    if (shouldDoBasicSetup) {
        console.log("Setting up basic stuff: Dependencies, roles, param store values");
        await DeploymentUtils.basicSetup(contracts, pools, treasuryAddress);
        console.log("\nDone with set up tokens\n");
    }

    if (shouldAddLiqToPool) {
        await fundCurvePool(contracts, pools);
        console.log("\nDone with adding liquidity to pool\n");
    }

    if (shouldCreateAuction) {
        console.log("Creating auction");
        const leverageHelper = new LeverageHelper(contracts);
        const auction = new AuctionInfo(
            100,
            NumberBundle.withNum(30),
            NumberBundle.withNum(60),
            NumberBundle.withNum(1000),
        );
        await contracts.auction.stopAuction();
        /// Minting LvUSD, you might want to disable this if post deployment
        await leverageHelper.mintLvUSD(auction.leverageAmount, contracts.coordinator.address);
        await leverageHelper.startAuctionAndAcceptLeverage(auction);

        // verify leverage on coordinator
        const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
        const coordinatorAvailableLvUSD = await leverageHelper.getLvUSDBalance(contracts.coordinator.address);
        console.log("accepted leverage is ", availableLeverage.getNum());
        console.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());
    }

    if (shouldVerifyArchimedesEngine) {
        await verifyArcimedesEngine(contracts);
    }

    console.log("\nDone with verifying tokens\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
