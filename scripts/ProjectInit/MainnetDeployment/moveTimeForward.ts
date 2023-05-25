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

const archAddress = "0x73C69d24ad28e2d43D03CBf35F79fE26EBDE1011";
const feeDisAddress = "0xB12a775ac2811b32c26Dfde3101Fd2018105De36";

async function main() {
    // const days45InSeconds = 60 * 60 * 24 * 45; // 45 days in seconds
    const days15InSeconds = 60 * 60 * 24 * 15; // 15 days in seconds

    time.increase(days15InSeconds)

    const signersToFund: SignerWithAddress[] = await ethers.getSigners();
    const userDistrbutorSigner = signersToFund[0]
    const feeDis = await ethers.getContractAt(feeDisABI, feeDisAddress, userDistrbutorSigner);
    const archToken = await ethers.getContractAt(abiUSDC, archAddress, userDistrbutorSigner);

    await archToken.approve(feeDisAddress, ValueStore.ONE_ETH);

    await feeDis.depositToken(archAddress, ValueStore.ONE_ETH);
    console.log("deposited arch")
    time.increase(days15InSeconds * 2)


}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
