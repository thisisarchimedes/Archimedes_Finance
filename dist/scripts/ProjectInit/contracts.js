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
exports.Contracts = void 0;
const hardhat_1 = __importStar(require("hardhat"));
const ValueStore_1 = require("./ValueStore");
const Logger_1 = require("./Logger");
class Contracts {
    async init(signers) {
        this.signers = signers;
        const contractsOwner = this.signers.owner;
        // get instances of external contracts
        this.externalOUSD = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressOUSD, ValueStore_1.ValueStore.abiOUSDToken, contractsOwner);
        this.externalUSDT = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressUSDT, ValueStore_1.ValueStore.abiUSDTToken, contractsOwner);
        this.externalDAI = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.addressDAI, ValueStore_1.ValueStore.abiUSDTToken, contractsOwner);
        this.external3CRV = new hardhat_1.ethers.Contract(ValueStore_1.ValueStore.address3CRV, ValueStore_1.ValueStore.abi3CRVToken, contractsOwner);
        // None upgradable contracts
        this.lvUSD = await this.deployContract("LvUSDToken", contractsOwner.address);
        // Notice the argument passed to constructor is the treasury address (where all arch tokens are minted)
        this.archToken = await this.deployContract("ArchToken", this.signers.treasury.address);
        // Upgradable contracts
        this.parameterStore = await this.deployContractProxy("ParameterStore");
        this.cdp = await this.deployContractProxy("CDPosition");
        this.coordinator = await this.deployContractProxy("Coordinator");
        this.exchanger = await this.deployContractProxy("Exchanger");
        this.leverageEngine = await this.deployContractProxy("LeverageEngine");
        this.positionToken = await this.deployContractProxy("PositionToken");
        this.poolManager = await this.deployContractProxy("PoolManager");
        this.auction = await this.deployContractProxy("Auction");
        this.zapper = await this.deployContractProxy("Zapper");
        // Upgradable contracts with constructor arguments
        this.vault = await this.deployContractProxy("VaultOUSD", [ValueStore_1.ValueStore.addressOUSD, "VaultOUSD", "VOUSD"]);
        Logger_1.Logger.log("Finished deploying contracts\n");
        return this;
    }
    async deployContractProxy(name, ...args) {
        const factory = await hardhat_1.ethers.getContractFactory(name);
        const contract = await hardhat_1.default.upgrades.deployProxy(factory, ...args, { kind: "uups" });
        Logger_1.Logger.log("Deployed " + name + " contract at address " + contract.address);
        return contract;
    }
    ;
    async deployContract(name, ...args) {
        const factory = await hardhat_1.ethers.getContractFactory(name);
        const contract = await factory.deploy(...args);
        Logger_1.Logger.log("Deployed " + name + " contract at address " + contract.address);
        return contract;
    }
}
exports.Contracts = Contracts;
