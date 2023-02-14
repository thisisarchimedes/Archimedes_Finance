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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContractTestContext = exports.ownerStartingLvUSDAmount = exports.signers = exports.startAuctionAcceptLeverageAndEndAuction = exports.setRolesForEndToEnd = void 0;
const hardhat_1 = __importStar(require("hardhat"));
const MainnetHelper_1 = require("./MainnetHelper");
const CurveHelper_1 = require("./CurveHelper");
async function setRolesForEndToEnd(r) {
    await r.coordinator.setExecutive(r.leverageEngine.address);
    await r.positionToken.setExecutive(r.leverageEngine.address);
    await r.exchanger.setExecutive(r.coordinator.address);
    await r.vault.setExecutive(r.coordinator.address);
    await r.cdp.setExecutive(r.coordinator.address);
}
exports.setRolesForEndToEnd = setRolesForEndToEnd;
async function startAuctionAcceptLeverageAndEndAuction(r, leverage, length = 5, startPrice = hardhat_1.ethers.utils.parseUnits("300.0"), endPrice = hardhat_1.ethers.utils.parseUnits("301.0")) {
    /// start Auction and end it to get a static endPrice
    const startBlock = await hardhat_1.ethers.provider.blockNumber;
    await r.auction.startAuctionWithLength(length, startPrice, endPrice);
    await r.coordinator.acceptLeverageAmount(leverage);
    for (let i = 0; i < length + 1; i++) {
        await hardhat_1.ethers.provider.send("evm_mine");
    }
}
exports.startAuctionAcceptLeverageAndEndAuction = startAuctionAcceptLeverageAndEndAuction;
exports.signers = hardhat_1.ethers.getSigners();
exports.ownerStartingLvUSDAmount = hardhat_1.ethers.utils.parseUnits("10000000.0");
async function buildContractTestContext(skipPoolBalances = false) {
    await (0, MainnetHelper_1.helperResetNetwork)(MainnetHelper_1.defaultBlockNumber);
    await hardhat_1.ethers.provider.send("evm_mine");
    const context = {};
    [context.owner, context.addr1, context.addr2, context.treasurySigner, context.addr3] = await exports.signers;
    context.externalOUSD = new hardhat_1.ethers.Contract(MainnetHelper_1.addressOUSD, MainnetHelper_1.abiOUSDToken, context.owner);
    context.externalUSDT = new hardhat_1.ethers.Contract(MainnetHelper_1.addressUSDT, MainnetHelper_1.abiUSDTToken, context.owner);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    context.external3CRV = new hardhat_1.ethers.Contract(MainnetHelper_1.address3CRV, MainnetHelper_1.abi3CRVToken, context.owner);
    const paramStoreFactory = await hardhat_1.ethers.getContractFactory("ParameterStore");
    context.parameterStore = await hardhat_1.default.upgrades.deployProxy(paramStoreFactory, [], { kind: "uups" });
    const cdpFactory = await hardhat_1.ethers.getContractFactory("CDPosition");
    context.cdp = await hardhat_1.default.upgrades.deployProxy(cdpFactory, [], { kind: "uups" });
    const coordinatorFactory = await hardhat_1.ethers.getContractFactory("Coordinator");
    context.coordinator = await hardhat_1.default.upgrades.deployProxy(coordinatorFactory, [], { kind: "uups" });
    const exchangerFactory = await hardhat_1.ethers.getContractFactory("Exchanger");
    context.exchanger = await hardhat_1.default.upgrades.deployProxy(exchangerFactory, [], { kind: "uups" });
    await hardhat_1.ethers.provider.send("evm_mine");
    const leverageEngineFactory = await hardhat_1.ethers.getContractFactory("LeverageEngine");
    context.leverageEngine = await hardhat_1.default.upgrades.deployProxy(leverageEngineFactory, [], { kind: "uups" });
    const positionTokenFactory = await hardhat_1.ethers.getContractFactory("PositionToken");
    context.positionToken = await hardhat_1.default.upgrades.deployProxy(positionTokenFactory, [], { kind: "uups" });
    const vaultFactory = await hardhat_1.ethers.getContractFactory("VaultOUSD");
    context.vault = await hardhat_1.default.upgrades.deployProxy(vaultFactory, [context.externalOUSD.address, "VaultOUSD", "VOUSD"], { kind: "uups" });
    const poolManagerFactory = await hardhat_1.ethers.getContractFactory("PoolManager");
    context.poolManager = await hardhat_1.default.upgrades.deployProxy(poolManagerFactory, [], { kind: "uups" });
    const archTokenfactory = await hardhat_1.ethers.getContractFactory("ArchToken");
    context.archToken = await archTokenfactory.deploy(context.treasurySigner.address);
    const lvUSDfactory = await hardhat_1.ethers.getContractFactory("LvUSDToken");
    context.lvUSD = await lvUSDfactory.deploy(context.owner.address);
    const auctionfactory = await hardhat_1.ethers.getContractFactory("Auction");
    context.auction = await hardhat_1.default.upgrades.deployProxy(auctionfactory, [], { kind: "uups" });
    await hardhat_1.ethers.provider.send("evm_mine");
    // Give context.owner some funds:
    // expecting minter to be owner
    await context.lvUSD.setMintDestination(context.owner.address);
    await context.lvUSD.mint(exports.ownerStartingLvUSDAmount);
    await (0, MainnetHelper_1.helperSwapETHWith3CRV)(context.owner, hardhat_1.ethers.utils.parseUnits("7000.0"));
    await hardhat_1.ethers.provider.send("evm_mine");
    // Create a LVUSD3CRV pool and fund with "fundedPoolAmount" of each token
    context.curveLvUSDPool = await (0, CurveHelper_1.createAndFundMetapool)(context.owner, context, skipPoolBalances);
    await hardhat_1.ethers.provider.send("evm_mine");
    // Setup pool with approval
    await context.lvUSD.approve(context.curveLvUSDPool.address, exports.ownerStartingLvUSDAmount);
    await context.lvUSD.approve(context.exchanger.address, hardhat_1.ethers.constants.MaxUint256);
    await context.lvUSD.approve(context.coordinator.address, hardhat_1.ethers.constants.MaxUint256);
    await hardhat_1.ethers.provider.send("evm_mine");
    // Post init contracts
    await context.leverageEngine.setDependencies(context.coordinator.address, context.positionToken.address, context.parameterStore.address, context.archToken.address, context.externalOUSD.address);
    await hardhat_1.ethers.provider.send("evm_mine");
    await context.coordinator.setDependencies(context.lvUSD.address, context.vault.address, context.cdp.address, context.externalOUSD.address, context.exchanger.address, context.parameterStore.address, context.poolManager.address, context.auction.address);
    await context.exchanger.setDependencies(context.parameterStore.address, context.coordinator.address, context.lvUSD.address, context.externalOUSD.address, context.external3CRV.address, context.curveLvUSDPool.address, MainnetHelper_1.addressCurveOUSDPool);
    await context.vault.setDependencies(context.parameterStore.address, context.externalOUSD.address);
    // await context.parameterStore.changeTreasuryAddress(context.treasurySigner.address);
    await context.poolManager.setDependencies(context.parameterStore.address, context.coordinator.address, context.lvUSD.address, context.external3CRV.address, context.curveLvUSDPool.address);
    await context.parameterStore.setDependencies(context.coordinator.address, context.exchanger.address, context.auction.address);
    await context.cdp.setDependencies(context.vault.address, context.parameterStore.address);
    await hardhat_1.ethers.provider.send("evm_mine");
    return context;
}
exports.buildContractTestContext = buildContractTestContext;
