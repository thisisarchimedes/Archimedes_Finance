import { Contracts } from "../Contracts";
import { ERC20Utils } from "../ERC20Utils";
import { Logger } from "../Logger";
import { NumberBundle } from "../NumberBundle";
import { DeployedStore } from "./DeployedStore";

function verifyValues(actualValue: NumberBundle, name: string, expectedValue: NumberBundle) {
    if (actualValue.getBn().eq(expectedValue.getBn()) === false) {
        throw new Error(`Expected "${name}" to be ${expectedValue.getNum()} but got ${actualValue.getNum}`);
    }
    Logger.log("Verified that %s is equal to expected value of %s", name, expectedValue.getNum());
}

function verifyStrings(actualString: string, name: string, expectedString: string) {
    if (actualString !== expectedString) {
        throw new Error(`Expected "${name}" to be ${expectedString} but got ${actualString}`);
    }
    Logger.log("Verified that %s is equal to expected value of %s", name, expectedString);
}

function verifyBooleans(actual: boolean, name: string, expected: boolean) {
    if (actual !== expected) {
        throw new Error(`Expected "${name}" to be ${expected} but got ${actual}`);
    }
    Logger.log("Verified that %s is equal to expected value of %s", name, expected);
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
        NumberBundle.withBn(totalAssets, 0),
        "Total assets",
        NumberBundle.withNum(0, 0),
    );
    Logger.log("ParameterStore Verified");
}

async function verifyCDPosition(contracts: Contracts) {
    const executive = await contracts.cdp.getAddressExecutive();
    verifyStrings(
        executive,
        "Executive Address of CDPosition",
        contracts.coordinator.address,
    );
    Logger.log("CDPosition Verified");
}

async function verifyCoordinator(contracts: Contracts) {
    const addressOfLvUSDToken = await contracts.coordinator.addressOfLvUSDToken();
    verifyStrings(
        addressOfLvUSDToken,
        "Coordinator LvUSD address",
        contracts.lvUSD.address,
    );
    Logger.log("Coordinator Verified");
}

async function verifyExchanger(contracts: Contracts) {
    const executive = await contracts.exchanger.getAddressExecutive();
    verifyStrings(
        executive,
        "Executive",
        contracts.coordinator.address,
    );
    Logger.log("Exchanger Verified");
}

async function verifyLeverageEngine(contracts: Contracts) {
    console.log("levEngine address", contracts.leverageEngine.address);
    const executive = await contracts.leverageEngine.getAddressExecutive();
    verifyStrings(
        executive,
        "Executive",
        contracts.signers.owner.address,
    );
    Logger.log("LeverageEngine Verified");
}

async function verifyPositionToken(contracts: Contracts) {
    console.log("positionToken address", contracts.positionToken.address);
    const exists = await contracts.positionToken.exists(0);
    verifyBooleans(
        exists,
        "Position Exists",
        false,
    );
    Logger.log("PositionToken Verified");
}

export async function deployOrGetAllContracts(contracts: Contracts, deployJustTokens: boolean = false, deployArchimedesEngine: boolean = false, deployVault: boolean = false) {
    if (deployJustTokens) {
        console.log("Deploying tokens");
        await contracts.setExternalTokensInstances();
        await contracts.initTokens();
    } else {
        console.log("Getting already deployed tokens instances from address");
        await contracts.setTokensInstances(DeployedStore.lvUSDAddress, DeployedStore.archTokenAddress);
        await contracts.setExternalTokensInstances();
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
            DeployedStore.zapperAddress,
        );
    }

    if (deployVault) {
        console.log("Deploying Vault");
        await contracts.initArchimedesUpgradableContractsWithConstructorArguments();
    } else {
        console.log("Getting Vault deployed token instances from address");
        await contracts.setArchimedesUpgradableContractsInstancesWithConstructorArguments(DeployedStore.vaultAddress);
    }
}

export async function verifyArcimedesEngine(contracts: Contracts) {
    // Arch and LvUSD
    await verifyTokens(contracts);
    await verifyParameterStore(contracts);
    await verifyVaultOUSD(contracts);
    await verifyCDPosition(contracts);
    await verifyCoordinator(contracts);
    await verifyExchanger(contracts);
    await verifyLeverageEngine(contracts);
    await verifyPositionToken(contracts);
}
