"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = __importStar(require("hardhat"));
const MainnetHelper_1 = require("../test/MainnetHelper");
const ContractTestContext_1 = require("../test/ContractTestContext");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "secrets/alchemy.env" });
// export const signers = ethers.getSigners();
let context;
const lvUSDAmount = "5000000";
const routeAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
async function fundLVUSDToCoordinator() {
    console.log("\nFunding lvUSD to coordinator\n");
    await context.lvUSD.setMintDestination(context.coordinator.address);
    await context.lvUSD.mint(hardhat_1.ethers.utils.parseUnits(lvUSDAmount, 18));
    // await context.coordinator.acceptLeverageAmount(ethers.utils.parseUnits(amount, 18));
    console.log(context.coordinator.address + " funded with " + lvUSDAmount + " LVUSD");
}
const fundARCH = async () => {
    console.log("Funding Arch to owner");
    const archAmountToFund = "1000";
    await context.archToken.connect(context.treasurySigner).transfer(context.owner.address, hardhat_1.ethers.utils.parseUnits(archAmountToFund));
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
    console.log("---- test calculateArchNeededForLeverage - ", await context.parameterStore.calculateArchNeededForLeverage(hardhat_1.ethers.utils.parseUnits("3.67")));
}
const deployScript = async () => {
    // hacky way to go around pool balances not working on local instance.. skipPoolBalances = true
    context = await (0, ContractTestContext_1.buildContractTestContext)(true);
    /// Setup Zapper + Uniswap
    await hardhat_1.ethers.provider.send("evm_mine");
    const zapperFactory = await hardhat_1.ethers.getContractFactory("Zapper");
    const zapper = await hardhat_1.default.upgrades.deployProxy(zapperFactory, [], { kind: "uups" });
    await zapper.setDependencies(MainnetHelper_1.addressOUSD, MainnetHelper_1.address3CRV, MainnetHelper_1.addressUSDT, MainnetHelper_1.addressCurveOUSDPool, routeAddress, context.leverageEngine.address, context.archToken.address, context.parameterStore.address);
    console.log("Zapper address is", await zapper.address);
    console.log("finished deploying Zapper");
    await hardhat_1.ethers.provider.send("evm_mine");
    await (0, MainnetHelper_1.createUniswapPool)(context);
    console.log("Finished deploying Uniswap");
    await (0, MainnetHelper_1.helperSwapETHWithUSDT)(context.owner, (0, MainnetHelper_1.bnFromNum)(1));
    await hardhat_1.ethers.provider.send("evm_mine");
    /// End Setup Zapper + Uniswap
    // const startBlock = await ethers.provider.blockNumber + 2;
    // await context.auction.startAuction(startBlock + 1,ethers.utils.parseUnits("301.0"), ethers.utils.parseUnits("300.0"))
    await fundLVUSDToCoordinator();
    await (0, ContractTestContext_1.setRolesForEndToEnd)(context);
    await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(context, hardhat_1.ethers.utils.parseUnits(lvUSDAmount, 18));
    const split = await zapper.previewTokenSplit((0, MainnetHelper_1.bnFromNum)("10.0", 6), 5, "0xdAC17F958D2ee523a2206206994597C13D831ec7");
    console.log("!!split!!", split);
    // await startAndEndAuction(context, 5);
    await (0, MainnetHelper_1.helperSwapETHWithOUSD)(context.owner, hardhat_1.ethers.utils.parseUnits("1.0"));
    await fundARCH();
    await fundDemoAccount();
    await verifyDeployment();
};
const simulateRebase = async () => {
    const [owner, addr1] = await hardhat_1.ethers.getSigners();
    const vaultAddress = "0x22a9B82A6c3D2BFB68F324B2e8367f346Dd6f32a";
    await (0, MainnetHelper_1.helperSwapETHWithOUSD)(owner, hardhat_1.ethers.utils.parseUnits("1.0"));
    const externalOUSD = new hardhat_1.ethers.Contract(MainnetHelper_1.addressOUSD, MainnetHelper_1.abiOUSDToken, owner);
    await externalOUSD.transfer(vaultAddress, hardhat_1.ethers.utils.parseUnits("20.0"));
};
const fundDemoAccount = async () => {
    const SignersToFund = await hardhat_1.ethers.getSigners();
    // remove owner and addr1 by shifting twice
    console.log("Starting to fund accounts");
    const treasurySigner = SignersToFund[3];
    SignersToFund.shift();
    SignersToFund.shift();
    SignersToFund.shift();
    const archToken = new hardhat_1.ethers.Contract("0x0a17FabeA4633ce714F1Fa4a2dcA62C3bAc4758d", MainnetHelper_1.abiOUSDToken);
    for (let i = 0; i < 2; i++) {
        // was 17
        // console.log("i: " + i + " - Funded address ");
        // const archAmountToFund = "200";
        // await context.archToken.connect(context.treasurySigner).transfer(SignersToFund[i].address, ethers.utils.parseUnits(archAmountToFund));
        // await helperSwapETHWithOUSD(SignersToFund[i], ethers.utils.parseUnits("0.4"));
        // console.log("i: " + i + " - Funded address "  + SignersToFund[i].address);
        const archAmountToFund = "200";
        await archToken.connect(treasurySigner).transfer(SignersToFund[i].address, hardhat_1.ethers.utils.parseUnits(archAmountToFund));
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(SignersToFund[i], hardhat_1.ethers.utils.parseUnits("0.4"));
        await (0, MainnetHelper_1.helperSwapETHWithUSDT)(SignersToFund[i], hardhat_1.ethers.utils.parseUnits("0.4"));
        await hardhat_1.ethers.provider.send("evm_mine");
        console.log("i: " + i + " - Funded address " + SignersToFund[i].address);
    }
};
deployScript();
// simulateRebase()
