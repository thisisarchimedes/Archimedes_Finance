import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { formatEther, formatUnits } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
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
import { deployOrGetAllContracts, verifyArcimedesEngine } from "./Helpers";

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6";
const gnosisOwnerAddress = "0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744";
const initOwnerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7";

async function main() {
    /// ----  Initialize contracts
    const signers = await new Signers().init();

    const contracts = new Contracts(signers);
    Logger.setVerbose(false);
    await deployOrGetAllContracts(contracts, false, false, false);
    const pools = await new Pools().init(contracts);
    // const positionManager = new PositionManager(contracts, pools);
    Logger.setVerbose(false);

    /// Impersonate admin and give it some Eth
    let gnosisOwner = await ethers.getImpersonatedSigner(gnosisOwnerAddress);
    const tx2 = await signers.owner.sendTransaction({
        to: gnosisOwner.getAddress(),
        value: ethers.utils.parseEther("20.0"),
    });

    await auctionInfo(contracts);

    await positionSummery(contracts);

    console.log("---- Now taking fees-----")
    await contracts.vault.connect(gnosisOwner).takeRebaseFees()
    console.log("---- Done taking fees-----")

    await positionSummery(contracts);

}

async function auctionInfo(contracts: Contracts) {
    const isAuctionClosed = await contracts.auction.isAuctionClosed();
    const currentBiddingPrice = await contracts.auction.getCurrentBiddingPrice();
    const availableLeverage = await contracts.coordinator.getAvailableLeverage();
    console.log("---- Auction Info ----- ");
    console.log("is auction closed? %s", isAuctionClosed);
    console.log("current bidding price %s", formatEther(currentBiddingPrice));
    console.log("available leverage %s", formatEther(availableLeverage));
}

async function positionSummery(contracts: Contracts) {
    const numberOfPositions = NumberBundle.withBn(await contracts.positionToken.totalSupply(), 0).getNum();
    const estimateLastPositionId = numberOfPositions * 2;
    let totalCollateral = 0;
    let totallvUSDDebt = 0;
    for (let index = 0; index < estimateLastPositionId; index++) {
        if (await contracts.positionToken.exists(index)) {
            const poisitionEstimatedEarning = NumberBundle.withBn(await contracts.cdp.getOUSDInterestEarned(index));
            console.log("position %s has earned %s interest", index, poisitionEstimatedEarning.getNum());
            const positionInfo = NumberBundle.withBn(await contracts.cdp.getOUSDPrinciple(index));
            const lvUSD = NumberBundle.withBn(await contracts.cdp.getLvUSDBorrowed(index));
            totalCollateral += positionInfo.getNum();
            totallvUSDDebt += lvUSD.getNum();
        }
    }

    const vaultOUSD = NumberBundle.withBn(await contracts.vault.totalSupply());


    console.log("---- Position Info ----- ");
    console.log("number of open positions %s", numberOfPositions);
    console.log("total collateral %s", totalCollateral);
    console.log("total lvUSD debt %s", totallvUSDDebt);

    console.log("Vault OUSD is %s . It should be close to lvUSD debt + total collateral which is %s", vaultOUSD.getNum(), totallvUSDDebt + totalCollateral);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
