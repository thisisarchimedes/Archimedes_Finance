import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ConfigurationServicePlaceholders } from "aws-sdk/lib/config_service_placeholders";
import { formatEther, formatUnits } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import { helperSwapETHWithOUSD } from "../../../test/MainnetHelper";
import { balPoolAbi } from "../balPoolAbi";
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
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { abiUSDC } from "../../../test/ABIs";
import { feeDisABI } from "../feeDisABI";
import moment from "moment";

const archAddress = "0x73C69d24ad28e2d43D03CBf35F79fE26EBDE1011";
const feeDisAddress = "0xB12a775ac2811b32c26Dfde3101Fd2018105De36";

async function main() {
    const oneDayInSeconds = 60 * 60 * 24; // 1 day in seconds

    // Move forward 32 days
    const daysToMove = 28;
    time.increase(oneDayInSeconds * daysToMove);
    console.log("moved forward " + daysToMove + " days");

    const signersToFund: SignerWithAddress[] = await ethers.getSigners();
    const userDistrbutorSigner = signersToFund[0];
    const feeDis = await ethers.getContractAt(feeDisABI, feeDisAddress, userDistrbutorSigner);
    const archToken = await ethers.getContractAt(abiUSDC, archAddress, userDistrbutorSigner);

    await archToken.approve(feeDisAddress, ValueStore.ONE_ETH);

    await feeDis.depositToken(archAddress, ValueStore.ONE_ETH);
    console.log("deposited arch rewards");

    const todayTimestamp = (await time.latest()) * 1000;
    console.log("today is now: ", moment(todayTimestamp).format("MMM DD, YYYY"));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
