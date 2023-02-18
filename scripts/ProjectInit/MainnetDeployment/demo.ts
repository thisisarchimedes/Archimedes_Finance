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

    // ------  Impersonate users and fund ETH
    const deployerOwner = await ethers.getImpersonatedSigner(initOwnerAddress);
    const gnosisOwner = await ethers.getImpersonatedSigner("0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6");
    const tx = await signers.owner.sendTransaction({
        to: deployerOwner.address,
        value: ethers.utils.parseEther("40.0"),
    });
    const tx2 = await signers.owner.sendTransaction({
        to: gnosisOwner.address,
        value: ethers.utils.parseEther("20.0"),
    });

    /// ----  Initialize contracts
    const contracts = new Contracts(signers);
    await deployOrGetAllContracts(contracts, false, false, false);
    const pools = await new Pools().init(contracts);

    /// ---------  Fund Users
    const SignersToFund: SignerWithAddress[] = await ethers.getSigners();
    // console.log("SignersToFund", SignersToFund[0].address);
    // SignersToFund.shift();
    // SignersToFund.shift();
    // SignersToFund.shift();
    for (let i = 0; i < 1; i++) {
        // await helperSwapETHWithOUSD(SignersToFund[0], ethers.utils.parseUnits("0.4"));
        await pools.getUSDToUser(SignersToFund[0].address);
        await contracts.archToken.connect(gnosisOwner).transfer(SignersToFund[0].address, ValueStore.TEN_ETH);
    }

    const positionManager = new PositionManager(contracts, pools);


    // -------  UNISWAP Info
    const path: string[] = [contracts.externalUSDC.address, contracts.archToken.address];
    const outArray = await pools.uniRouter.getAmountsIn(ValueStore.ONE_ETH, path);
    const uniswapPriceOfArch = NumberBundle.withBn(outArray[0], 6);
    console.log("uniswap price of arch is", uniswapPriceOfArch.getNum());


    // const position = await PositionInfo.build(contracts, SignersToFund[0], NumberBundle.withNum(20), 5);
    // Logger.setVerbose(true);
    // // await positionManager.createPositionEndToEnd(position, true);
    // let availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    // console.log("availableLeverage before creating position is ", availableLeverage.getNum());
    // await positionManager.createPositionEndToEnd(position, true);
    // availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    // console.log("availableLeverage after creating position is ", availableLeverage.getNum());
    // await EtherUtils.mineBlock();
    // await positionManager.unwindPosition(position);
    // console.log("redeemed position for %s OUSD, which means earning of %s OUSD", position.ousdRedeemed.getNum(), position.ousdFinalEarning)

    // console.log("owner arch balance is", formatEther(await contracts.archToken.balanceOf(signers.owner.address)));
    // console.log("owner oUSD balance is", formatEther(await contracts.externalOUSD.balanceOf(signers.owner.address)));
    // console.log("owner arch allowance to levEngine is",
    //     formatEther(await contracts.archToken.allowance(signers.owner.address, contracts.leverageEngine.address)));
    // console.log("owner OUSD allowance to levEngine is",
    //     formatEther(await contracts.externalOUSD.allowance(signers.owner.address, contracts.leverageEngine.address)));
    const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
    // const coordinatorAvailableLvUSD = NumberBundle.withBn(await contracts.lvUSD.balanceOf(contracts.coordinator.address));
    // const isAuctionClosed = await contracts.auction.isAuctionClosed();
    console.log("accepted leverage is ", availableLeverage.getNum());
    const currentBiddingPrice = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
    console.log("current bidding price is ", currentBiddingPrice.getNum());
    // console.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());
    // console.log("isAuctionClosed", isAuctionClosed);

    // ----  Deploy new zapper
    // contracts.zapper = await contracts.deployContractProxy("Zapper");
    // await contracts.zapper.setDependencies(
    //     contracts.leverageEngine.address,
    //     contracts.archToken.address,
    //     contracts.parameterStore.address,
    // );


    // OR  ------- Upgrade zapper

    const newZapperImp = await contracts.deployContract("Zapper");
    await contracts.zapper.connect(deployerOwner).upgradeTo(newZapperImp.address);



    // ------- Zap in process
    const collataeral6dec = NumberBundle.withNum(20, 6)
    const previewResults = await contracts.zapper.previewZapInAmount(
        collataeral6dec.getBn(),
        5,
        contracts.externalUSDT.address,
        true
    )
    console.log("Preview zapping position with %s USDT, not user user arch", collataeral6dec.getNum());
    const archTokenAmountReturn = NumberBundle.withBn(previewResults.archTokenAmountReturn);
    console.log("archTokenAmountReturn ", archTokenAmountReturn.getNum());
    const ousdCollateralAmountReturn = NumberBundle.withBn(previewResults.ousdCollateralAmountReturn);
    console.log("ousdCollateralAmountReturn ", ousdCollateralAmountReturn.getNum());
    console.log("Now zapping using %s USDT", collataeral6dec.getNum());
    await contracts.externalUSDT.approve(contracts.zapper.address, collataeral6dec.getBn());
    await contracts.archToken.approve(contracts.zapper.address, archTokenAmountReturn.getBn());
    await contracts.zapper.zapIn(
        collataeral6dec.getBn(),
        5,
        archTokenAmountReturn.getBn(),
        ousdCollateralAmountReturn.getBn(),
        990,
        contracts.externalUSDT.address,
        true
    )
    console.log("Done zapping in, now printing position info")
    const zappedPosition = await PositionInfo.build(contracts, signers.owner, ousdCollateralAmountReturn, 5);
    zappedPosition.positionTokenNum = 1; /// This is super important -< need to choose the right one!
    await zappedPosition.fillPositionPostCreation();
    Logger.setVerbose(true);
    await zappedPosition.printPositionInfo();

    // ------- Zap out/unwind process
    console.log("Now unwinding zapped position")
    const ownerOUSDBalancBefore = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(signers.owner.address));
    await positionManager.unwindPosition(zappedPosition);
    const ownerOUSDBalancAfter = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(signers.owner.address));

    console.log("owner OUSD windfall from Zapped position is", ownerOUSDBalancAfter.getNum() - ownerOUSDBalancBefore.getNum());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
