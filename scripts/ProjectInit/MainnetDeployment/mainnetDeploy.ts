// const { program } = require('commander');
// program
//     .option('--tokens --deploytokens <boolean>', 'Should we deploy tokens?', true)
// program.parse();
// const options = program.opts();

import { Contracts } from "../Contracts";
import { DeploymentUtils } from "../DeploymentUtils";
import { ERC20Utils } from "../ERC20Utils";
import { Logger } from "../Logger";
import { NumberBundle } from "../NumberBundle";
import { Pools } from "../Pools";
import { Signers } from "../Signers";
import { DeployedStore } from "./DeployedStore";


// console.log("Should we deploy tokens? ", options.deploytokens);


/// We would probably change this to command line arguments later but for now
const deployJustTokens = true;
const deployArchimedesEngine = true;
const deployVault = true;
const shouldVerifyTokens = false;
const shouldVerifyArchimedesEngine = false;

const shouldCreatePool = true;

const shouldDoBasicSetup = true;

async function main() {
    Logger.setVerbose(true);
    const signers = await new Signers().init()
    const contracts = new Contracts(signers)

    await deployOrGetAllContracts(contracts, deployJustTokens, deployArchimedesEngine, deployVault);

    const pools = await new Pools().init(contracts, shouldCreatePool)
    // console.log("curve lvUSD pool ", pools.curveLvUSDPool)
    console.log("\nDone with deploying/get instances the whole of archimedes. Now verifying them:");

    if (shouldVerifyTokens) {
        await verifyTokens(contracts);
    }
    if (shouldVerifyArchimedesEngine) {
        await verifyArcimedesEngine(contracts);
    }
    console.log("\nDone with verifying tokens\n");
    if (shouldDoBasicSetup) {
        console.log("Setting up basic stuff: Dependencies, roles, param store values");
        await DeploymentUtils.basicSetup(contracts, pools);
    }
    console.log("\nDone with set up tokens\n");

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

function verifyValues(actualValue: NumberBundle, name: string, expectedValue: NumberBundle) {
    if (actualValue.getBn().eq(expectedValue.getBn()) == false) {
        throw new Error(`Expected "${name}" to be ${expectedValue.getNum()} but got ${actualValue.getNum}`);
    }
    Logger.log("Verified that %s is equal to expected value of %s", name, expectedValue.getNum());
}

function verifyStrings(actualString: string, name: string, expectedString: string) {
    if (actualString !== expectedString) {
        throw new Error(`Expected "${name}" to be ${expectedString} but got ${actualString}`);
    }
    Logger.log("Verified that %s is equal to expected string of %s", name, expectedString);
}

async function verifyTokens(contracts: Contracts) {
    const treasuryArchTokenBalance = await ERC20Utils.balance(contracts.signers.treasury.address, contracts.archToken);
    verifyValues(treasuryArchTokenBalance, "Treasury Arch token balance", NumberBundle.withNum(100000000));
    Logger.log("ArchToken Verified");

    const lvUSDDecimal = await ERC20Utils.decimals(contracts.lvUSD);
    verifyValues(lvUSDDecimal, "lvUSD decimals", NumberBundle.withNum(18, 0));
    Logger.log("LvUSDToken Verified");
}

async function verifyParameterStore(contracts: Contracts) {
    const maxCycles = await contracts.parameterStore.getMaxNumberOfCycles();
    verifyValues(
        NumberBundle.withBn(maxCycles, 0),
        "Max cycles",
        NumberBundle.withNum(10, 0),
    );
    Logger.log("ParameterStore Verified");
}

async function verifyVaultOUSD(contracts: Contracts) {
    const totalAssets = await contracts.vault.totalAssets();
    verifyValues(
        NumberBundle.withBn(totalAssets),
        "Total assets",
        NumberBundle.withNum(0),
    );
    Logger.log("VaultOUSD Verified");
}

// async function verifyCDPosition(contracts: Contracts) {
//     const addressExecutive = await contracts.cdp.getAddressExecutive();
//     verifyStrings(
//         addressExecutive,
//         "Executive address",
//         DeployedStore. // Insert address of executive
//     );
//     Logger.log("");
// }

// async function verifyCoordinator(contracts: Contracts) {

//     verifyValues(

//     );
//     Logger.log("");
// }

// async function verifyExchanger(contracts: Contracts) {

//     verifyValues(

//     );
//     Logger.log("");
// }

// async function verifyLeverageEngine(contracts: Contracts) {

//     verifyValues(

//     );
//     Logger.log("");
// }

// async function verifyPositionToken(contracts: Contracts) {

//     verifyValues(

//     );
//     Logger.log("");
//  }

async function deployOrGetAllContracts(contracts: Contracts, deployJustTokens: boolean, deployArchimedesEngine: boolean, deployVault: boolean) {
    if (deployJustTokens) {
        console.log("Deploying tokens");
        await contracts.setExternalTokensInstances()
        await contracts.initTokens();

    } else {
        console.log("Getting already deployed tokens instances from address");
        await contracts.setTokensInstances(DeployedStore.lvUSDAddress, DeployedStore.archTokenAddress);
        await contracts.setExternalTokensInstances()
    }

    if (deployArchimedesEngine) {
        console.log("Deploying most of Archimedes Engine(vault not included)");
        await contracts.initArchimedesUpgradableContracts();
    } else {
        console.log("Getting ArchimedesEngine deployed tokens instances from address(vault not included)");
        await contracts.setArchimedesUpgradableContractsInstances(
            DeployedStore.parameterStoreAddress,
            DeployedStore.cdpAddress,
            DeployedStore.coordinatorAddress,
            DeployedStore.exchangerAddress,
            DeployedStore.leverageEngineAddress,
            DeployedStore.positionTokenAddress,
            DeployedStore.poolManagerAddress,
            DeployedStore.auctionAddress,
            DeployedStore.zapperAddress
        );
    }

    if (deployVault) {
        console.log("Deploying Vault");
        await contracts.initArchimedesUpgradableContractsWithConstructorArguments();
    } else {
        console.log("Getting Vault deployed token instances from address");
        await contracts.setArchimedesUpgradableContractsInstancesWithConstructorArguments(DeployedStore.vaultAddress)
    }
}

async function verifyArcimedesEngine(contracts: Contracts) {
    // Arch and LvUSD
    await verifyTokens(contracts);
    await verifyParameterStore(contracts);
}

