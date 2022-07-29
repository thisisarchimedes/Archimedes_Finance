import hre, { ethers } from "hardhat";

import { helperSwapETHWithOUSD } from "../test/MainnetHelper";
import { buildContractTestContext, setRolesForEndToEnd } from "../test/ContractTestContext";
import dotenv from "dotenv";

dotenv.config({ path: "secrets/alchemy.env" });

export const signers = ethers.getSigners();

let context;

async function fundLVUSDToCoordinator () {
    console.log("Funding lvUSD to coordinator");
    const amount = "10000";

    await context.lvUSD.setMintDestination(context.coordinator.address);
    await context.lvUSD.mint(ethers.utils.parseUnits(amount, 18));

    console.log(context.coordinator.address + " funded with " + amount + " LVUSD");
}

const fundARCH = async () => {
    console.log("Funding Arch to owner");
    const archAmountToFund = "1000";
    await context.archToken.connect(context.treasurySigner).transfer(context.owner.address, ethers.utils.parseUnits(archAmountToFund));
    console.log(context.owner.address + " funded with " + archAmountToFund + " ARCH");
};

async function verifyDeployment () {
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
    // hacky way to go around pool balances not working on local instance.. skipPoolBalances = true
    context = await buildContractTestContext(true);
    await setRolesForEndToEnd(context);
    await helperSwapETHWithOUSD(context.owner, ethers.utils.parseUnits("1.0"));
    await fundLVUSDToCoordinator();
    await fundARCH();
    await verifyDeployment();
};

deployScript();
