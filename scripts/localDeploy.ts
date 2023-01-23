import hre, { ethers } from "hardhat";
import {
    helperSwapETHWithOUSD, createUniswapPool, addressOUSD, abiOUSDToken,
    helperSwapETHWithUSDT, address3CRV, addressUSDT, addressCurveOUSDPool,
    numFromBn, bnFromStr, bnFromNum,
} from "../test/MainnetHelper";
import {
    buildContractTestContext, setRolesForEndToEnd,
    startAndEndAuction, startAuctionAcceptLeverageAndEndAuction
} from "../test/ContractTestContext";
import dotenv from "dotenv";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

dotenv.config({ path: "secrets/alchemy.env" });

// export const signers = ethers.getSigners();

let context;
const lvUSDAmount = "5000000";
const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"

async function fundLVUSDToCoordinator() {
    console.log("\nFunding lvUSD to coordinator\n");

    await context.lvUSD.setMintDestination(context.coordinator.address);
    await context.lvUSD.mint(ethers.utils.parseUnits(lvUSDAmount, 18));
    // await context.coordinator.acceptLeverageAmount(ethers.utils.parseUnits(amount, 18));

    console.log(context.coordinator.address + " funded with " + lvUSDAmount + " LVUSD");
}

const fundARCH = async () => {
    console.log("Funding Arch to owner");
    const archAmountToFund = "1000";
    await context.archToken.connect(context.treasurySigner).transfer(context.owner.address, ethers.utils.parseUnits(archAmountToFund));
    console.log(context.owner.address + " funded with " + archAmountToFund + " ARCH");
};

async function verifyDeployment() {
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
    console.log(
        "---- test calculateArchNeededForLeverage - ",
        await context.parameterStore.calculateArchNeededForLeverage(ethers.utils.parseUnits("3.67")),
    );
}

const deployScript = async () => {
    // hacky way to go around pool balances not working on local instance.. skipPoolBalances = true
    context = await buildContractTestContext(true);

    /// Setup Zapper + Uniswap
    await ethers.provider.send("evm_mine");

    const zapperFactory = await ethers.getContractFactory("Zapper");
    const zapper = await hre.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
    await zapper.setDependencies(
        context.leverageEngine.address, context.archToken.address, context.parameterStore.address);

    console.log("Zapper address is", await zapper.address);

    console.log("finished deploying Zapper")

    await ethers.provider.send("evm_mine");

    await createUniswapPool(context);
    console.log("Finished deploying Uniswap")

    await helperSwapETHWithUSDT(context.owner, bnFromNum(1));

    await ethers.provider.send("evm_mine");

    /// End Setup Zapper + Uniswap
    // const startBlock = await ethers.provider.blockNumber + 2;
    // await context.auction.startAuction(startBlock + 1,ethers.utils.parseUnits("301.0"), ethers.utils.parseUnits("300.0"))
    await fundLVUSDToCoordinator();
    await setRolesForEndToEnd(context);
    await startAuctionAcceptLeverageAndEndAuction(context, ethers.utils.parseUnits(lvUSDAmount, 18));

    const coodinatorLvUSDBalace = await context.lvUSD.balanceOf(context.coordinator.address);
    console.log("coordinator lvUSD balance is", numFromBn(coodinatorLvUSDBalace));
    const coordinatorAvailableLvUSD = await context.coordinator.getAvailableLeverage();
    console.log("coordinator available lvUSD is ", numFromBn(coordinatorAvailableLvUSD));
    const split = await zapper.previewTokenSplit(bnFromNum("10.0", 6), 5, "0xdAC17F958D2ee523a2206206994597C13D831ec7");
    console.log("!!split!!", split);


    await helperSwapETHWithOUSD(context.owner, ethers.utils.parseUnits("1.0"));
    await fundARCH();
    await fundDemoAccount();
    await verifyDeployment();
};

const simulateRebase = async () => {
    const [owner, addr1] = await ethers.getSigners();
    const vaultAddress = "0x22a9B82A6c3D2BFB68F324B2e8367f346Dd6f32a";
    await helperSwapETHWithOUSD(owner, ethers.utils.parseUnits("1.0"));
    const externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, owner);
    await externalOUSD.transfer(vaultAddress, ethers.utils.parseUnits("20.0"));
};

const fundDemoAccount = async () => {
    const SignersToFund: SignerWithAddress[] = await ethers.getSigners();
    // remove owner and addr1 by shifting twice
    console.log("Starting to fund accounts");
    const treasurySigner = SignersToFund[3];

    SignersToFund.shift();
    SignersToFund.shift();
    SignersToFund.shift();

    const archToken = new ethers.Contract("0x0a17FabeA4633ce714F1Fa4a2dcA62C3bAc4758d", abiOUSDToken);

    for (let i = 0; i < 5; i++) {
        // was 17
        // console.log("i: " + i + " - Funded address ");

        // const archAmountToFund = "200";
        // await context.archToken.connect(context.treasurySigner).transfer(SignersToFund[i].address, ethers.utils.parseUnits(archAmountToFund));
        // await helperSwapETHWithOUSD(SignersToFund[i], ethers.utils.parseUnits("0.4"));
        // console.log("i: " + i + " - Funded address "  + SignersToFund[i].address);

        const archAmountToFund = "200";
        await archToken.connect(treasurySigner).transfer(SignersToFund[i].address, ethers.utils.parseUnits(archAmountToFund));
        await helperSwapETHWithOUSD(SignersToFund[i], ethers.utils.parseUnits("0.4"));
        await helperSwapETHWithUSDT(SignersToFund[i], ethers.utils.parseUnits("0.4"));
        await ethers.provider.send("evm_mine");

        console.log("i: " + i + " - Funded address " + SignersToFund[i].address);
    }
};

deployScript();
// simulateRebase()
