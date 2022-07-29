import hre, { ethers } from "hardhat";

import { helperSwapETHWithOUSD } from "../test/MainnetHelper";
import { buildContractTestContext, setRolesForEndToEnd } from "../test/ContractTestContext";
import { stopImpersonate } from "../integrationTests/IntegrationTestContext";
import dotenv from "dotenv";

dotenv.config({ path: "secrets/alchemy.env" });

export const signers = ethers.getSigners();

let context;

const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";

async function fundLVUSD () {
    console.log("Funding lvUSD");
    const amount = "10000";

    await context.lvUSD.setMintDestination(context.coordinator.address);
    await context.lvUSD.mint(ethers.utils.parseUnits(amount, 18));

    console.log(context.coordinator.address + " funded with " + amount + " LVUSD");
}

const fundARCH = async () => {
    console.log("Funding Arch");
    const archAmountToFund = 1000;
    await context.archToken.connect(context.treasurySigner).transfer(context.owner.address, ethers.utils.parseUnits(archAmountToFund));
    console.log(context.owner.address + " funded with " + archAmountToFund + " ARCH");
};

const cleanup = async () => {
    await stopImpersonate(addresslvUSDMinter);
    await stopImpersonate(addresslvUSDAdmin);
};

async function verifyDeployment () {
    console.log("ParamStore value rebaseFeeRate = %s", await context.parameterStore.getRebaseFeeRate());
    console.log("lvUSD address is", await context.lvUSD.address);
    console.log("Arch address is", await context.archToken.address);
    console.log("LevEngine address is", await context.leverageEngine.address);
    console.log("PositionToken address is", await context.positionToken.address);
    console.log("(local) OUSD address is", await context.externalOUSD.address);
    console.log("--Exchanger address is", await context.exchanger.address);
    console.log("--Coordinator address is", await context.coordinator.address);
    console.log("--ParamStore address is", await context.parameterStore.address);
    console.log("--Vault address is", await context.vault.address);
    console.log("--CDP address is", await context.cdp.address);
    console.log("------ owner address is", await context.owner.address);
    console.log("------ curve pool address is", await context.curveLvUSDPool.address);
}

const deployScript = async () => {
    context = await buildContractTestContext();
    await setRolesForEndToEnd(context);
    await helperSwapETHWithOUSD(context.owner, ethers.utils.parseUnits("1.0"));
    await fundLVUSD();
    await fundARCH();
    await verifyDeployment();
    await cleanup();
};

deployScript();
