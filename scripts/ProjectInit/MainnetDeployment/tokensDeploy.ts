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

const deployTokens: boolean = true;

const treasuryAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function main() {
    Logger.setVerbose(true);
    const signers = await new Signers().initOwnerOnly();
    console.log("Expeting signer address to be 0x2546BcD3c84621e976D8185a91A922aE77ECEc30");
    console.log("Signers initialized with owner being ", signers.owner.address);
    
    const contracts = new Contracts(signers);
    if (deployTokens) {
        console.log("Deploying tokens");
        await contracts.initTokens(treasuryAddress);
    } else {
        console.log("Getting already deployed tokens instances from address");
        await contracts.setTokensInstances(DeployedStore.lvUSDAddress, DeployedStore.archTokenAddress);
    };

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