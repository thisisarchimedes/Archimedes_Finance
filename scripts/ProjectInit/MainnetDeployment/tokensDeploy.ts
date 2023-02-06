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

const deployTokens = true;

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6";

async function main() {
    Logger.setVerbose(true);
    const signers = await new Signers().initOwnerOnly();
    console.log("Expeting signer address to be 0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7");
    console.log("Signers initialized with owner being ", signers.owner.address);

    const contracts = new Contracts(signers);
    if (deployTokens) {
        console.log("Deploying tokens");
        await contracts.initTokens(treasuryAddress);
    } else {
        console.log("Getting already deployed tokens instances from address");
        await contracts.setTokensInstances(DeployedStore.lvUSDAddress, DeployedStore.archTokenAddress);
    }

    console.log("Done with deploying. Verifying tokens");
    const lvUSDDecimals = await ERC20Utils.decimals(contracts.lvUSD);
    const lvUSDName = await ERC20Utils.name(contracts.lvUSD);
    const lvUSDSymbol = await ERC20Utils.symbol(contracts.lvUSD);
    const archTokenDecimals = await ERC20Utils.decimals(contracts.archToken);
    const archTokenName = await ERC20Utils.name(contracts.archToken);
    const archTokenSymbol = await ERC20Utils.symbol(contracts.archToken);
    console.log("%s with name %s has decimals: ", lvUSDSymbol, lvUSDName, lvUSDDecimals.getNum());
    console.log("%s with name %s decimals: ", archTokenSymbol, archTokenName, archTokenDecimals.getNum());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
