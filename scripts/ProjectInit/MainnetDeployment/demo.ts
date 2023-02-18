import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { helperSwapETHWithOUSD } from "../../../test/MainnetHelper";
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

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6";
const initOwnerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7";

async function main() {
    const signers = await new Signers().init();

    // Impersonate users and fund ETH
    const deployerOwner = await ethers.getImpersonatedSigner(initOwnerAddress);
    const gnosisOwner = await ethers.getImpersonatedSigner("0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6");
    const tx = await signers.owner.sendTransaction({
        to: deployerOwner.address,
        value: ethers.utils.parseEther("40.0"),
    });
    console.log("user eth balance is", formatEther(await deployerOwner.getBalance()));
    const tx2 = await signers.owner.sendTransaction({
        to: gnosisOwner.address,
        value: ethers.utils.parseEther("20.0"),
    });
    console.log("gnosisOwner eth balance is", formatEther(await gnosisOwner.getBalance()));

    /// Initialize contracts
    const contracts = new Contracts(signers);
    await deployOrGetAllContracts(contracts, false, false, false);
    const pools = await new Pools().init(contracts);

    // /// UNISWAP path USDT -> ETH -> ARCH
    const path: string[] = [contracts.externalUSDT.address, await pools.uniRouter.WETH(), contracts.archToken.address];
    const outArray = await pools.uniRouter.getAmountsIn(ValueStore.ONE_ETH, path);
    // const uniswapPriceOfArch = NumberBundle.withBn(outArray[0], 6);
    // console.log("uniswap price of arch is", uniswapPriceOfArch.getNum());

    /// Fund Users
    const SignersToFund: SignerWithAddress[] = await ethers.getSigners();
    // console.log("SignersToFund", SignersToFund[0].address);
    // SignersToFund.shift();
    // SignersToFund.shift();
    // SignersToFund.shift();
    for (let i = 0; i < 1; i++) {
        await helperSwapETHWithOUSD(SignersToFund[0], ethers.utils.parseUnits("0.4"));
        await pools.getUSDToUser(SignersToFund[0].address);
        await contracts.archToken.connect(gnosisOwner).transfer(SignersToFund[0].address, ValueStore.TEN_ETH);
    }


    const positionManager = new PositionManager(contracts, pools);
    const position = await PositionInfo.build(contracts, SignersToFund[0], NumberBundle.withNum(20), 5);
    Logger.setVerbose(true);
    // await positionManager.createPositionEndToEnd(position, true);
    let availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    console.log("availableLeverage before creating position is ", availableLeverage.getNum());
    await positionManager.createPositionEndToEnd(position, true);
    availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    console.log("availableLeverage after creating position is ", availableLeverage.getNum());
    await EtherUtils.mineBlock();
    await positionManager.unwindPosition(position);
    console.log("redeemed position for %s OUSD, which means earning of %s OUSD", position.ousdRedeemed.getNum(), position.ousdFinalEarning)

    // console.log("owner arch balance is", formatEther(await contracts.archToken.balanceOf(signers.owner.address)));
    // console.log("owner oUSD balance is", formatEther(await contracts.externalOUSD.balanceOf(signers.owner.address)));
    // console.log("owner arch allowance to levEngine is",
    //     formatEther(await contracts.archToken.allowance(signers.owner.address, contracts.leverageEngine.address)));
    // console.log("owner OUSD allowance to levEngine is",
    //     formatEther(await contracts.externalOUSD.allowance(signers.owner.address, contracts.leverageEngine.address)));
    // const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    // const currentBiddingPrice = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
    // const coordinatorAvailableLvUSD = NumberBundle.withBn(await contracts.lvUSD.balanceOf(contracts.coordinator.address));
    // const isAuctionClosed = await contracts.auction.isAuctionClosed();
    // console.log("accepted leverage is ", availableLeverage.getNum());
    // console.log("current bidding price is ", currentBiddingPrice.getNum());
    // console.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());
    // console.log("isAuctionClosed", isAuctionClosed);

    // /// Deploy new zapper
    // contracts.zapper = await contracts.deployContractProxy("Zapper");
    // await contracts.zapper.setDependencies(
    //     contracts.leverageEngine.address,
    //     contracts.archToken.address,
    //     contracts.parameterStore.address,
    // );
    // const previewResults = await contracts.zapper.previewZapInAmount(
    //     ethers.utils.parseUnits("10", 6),
    //     5,
    //     contracts.externalUSDT.address,
    //     true
    // )
    // console.log("previewResults", previewResults);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
