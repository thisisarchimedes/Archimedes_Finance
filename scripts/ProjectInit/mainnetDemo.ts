import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Contracts } from "../Contracts";
import { DeploymentUtils } from "../DeploymentUtils";
import { ERC20Utils } from "../ERC20Utils";
import { EtherUtils } from "../EtherUtils";
import { AuctionInfo, LeverageHelper } from "../LeverageHelper";
import { Logger } from "../Logger";
import { NumberBundle } from "../NumberBundle";
import { Pools } from "../Pools";
import { Signers } from "../Signers";
import { fundCurvePool } from "./CommonActions";
import { DeployedStore } from "./DeployedStore";
import { deployOrGetAllContracts, verifyArcimedesEngine } from "./Helpers";

const shouldVerifyArchimedesEngine = false;

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6"
const initOwnerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7"

async function main() {
    const signers = await new Signers().init();

    const deployerOwner = await ethers.getImpersonatedSigner(initOwnerAddress);

    const contracts = new Contracts(signers);
    await deployOrGetAllContracts(contracts, false, false, false);

    // verify leverage on coordinator
    const leverageHelper = new LeverageHelper(contracts);

    const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    const currentBiddingPrice = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
    const coordinatorAvailableLvUSD = await leverageHelper.getLvUSDBalance(contracts.coordinator.address);
    Logger.log("accepted leverage is ", availableLeverage.getNum());
    Logger.log("current bidding price is ", currentBiddingPrice.getNum());
    Logger.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());



    if (shouldVerifyArchimedesEngine) {
        await verifyArcimedesEngine(contracts);
    }

    console.log("\nDone with verifying tokens\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
