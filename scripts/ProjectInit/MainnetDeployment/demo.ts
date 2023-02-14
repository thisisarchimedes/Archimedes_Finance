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
import { PositionInfo } from "../PositionInfo";
import { PositionManager } from "../PositionManager";
import { Signers } from "../Signers";
import { ValueStore } from "../ValueStore";
import { fundCurvePool } from "./CommonActions";
import { DeployedStore } from "./DeployedStore";
import { deployOrGetAllContracts, verifyArcimedesEngine } from "./Helpers";

const shouldVerifyArchimedesEngine = true;

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6"
const initOwnerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7"

async function main() {
    const signers = await new Signers().init();

    const deployerOwner = await ethers.getImpersonatedSigner(initOwnerAddress);
    const tx = await signers.owner.sendTransaction({
        to: deployerOwner.address,
        value: ethers.utils.parseEther("80.0")
    });
    console.log("user eth balance is", formatEther(await deployerOwner.getBalance()));

    const contracts = new Contracts(signers);
    await deployOrGetAllContracts(contracts, false, false, false);
    const pools = await new Pools().init(contracts);

    /// UNISWAP path USDT -> ETH -> ARCH
    let path: string[] = [contracts.externalUSDT.address, await pools.uniRouter.WETH(), contracts.archToken.address];
    const outArray = await pools.uniRouter.getAmountsIn(ValueStore.ONE_ETH, path);
    const uniswapPriceOfArch = NumberBundle.withBn(outArray[0], 6);
    console.log("uniswap price of arch is", uniswapPriceOfArch.getNum());

    const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    const currentBiddingPrice = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
    const coordinatorAvailableLvUSD = NumberBundle.withBn(await contracts.lvUSD.balanceOf(contracts.coordinator.address));
    const isAuctionClosed = await contracts.auction.isAuctionClosed()
    console.log("accepted leverage is ", availableLeverage.getNum());
    console.log("current bidding price is ", currentBiddingPrice.getNum());
    console.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());
    console.log("isAuctionClosed", isAuctionClosed);


    const positionManager = new PositionManager(contracts, pools);
    const positionInfo = await PositionInfo.build(contracts, deployerOwner, NumberBundle.withNum(20), 5);

    await positionManager.createPositionEndToEnd(positionInfo, true)

    if (shouldVerifyArchimedesEngine) {
        await verifyArcimedesEngine(contracts);
    }

    console.log("\nDone with verifying tokens\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
