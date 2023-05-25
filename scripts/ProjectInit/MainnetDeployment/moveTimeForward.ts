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


async function main() {
    const days45InSeconds = 60 * 60 * 24 * 45; // 45 days in seconds
    time.increase(days45InSeconds)
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
