import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import type { Contract } from "@nomiclabs/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import { Signers } from "./Signers";
import { Coordinator } from "../../types/contracts/Coordinator";
import { Exchanger } from "../../types/contracts/Exchanger";
import { LeverageEngine } from "../../types/contracts/LeverageEngine";
import { PositionToken } from "../../types/contracts/PositionToken";
import { VaultOUSD } from "../../types/contracts/VaultOUSD";
import { ArchToken } from "../../types/contracts/ArchToken";
import { LvUSDToken } from "../../types/contracts/LvUSDToken";
import { PoolManager } from "../../types/contracts/PoolManager";
import { Auction } from "../../types/contracts/Auction";
import { ParameterStore } from "../../types/contracts/ParameterStore";
import { CDPosition } from "../../types/contracts/CDPosition";
import { Zapper } from "../../types/contracts/Zapper";
import { IERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/IERC20";
import { ValueStore } from "./ValueStore";
import { Logger } from "./Logger";
import { Pools } from "./Pools";
import { ERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/ERC20";

export class Contracts {
    // Signer that owns contract
    signers!: Signers;
    /// Contracts 
    parameterStore!: ParameterStore;
    cdp!: CDPosition;
    coordinator!: Coordinator;
    exchanger!: Exchanger;
    leverageEngine!: LeverageEngine;
    positionToken!: PositionToken;

    vault!: VaultOUSD;
    archToken!: ArchToken;
    lvUSD!: LvUSDToken;
    poolManager!: PoolManager
    auction!: Auction;
    zapper!: Zapper;

    // External contracts
    externalOUSD!: ERC20;
    externalUSDT!: ERC20;
    externalDAI!: ERC20;
    external3CRV!: ERC20;

    constructor (signers: Signers) {
        this.signers = signers;
    }

    async init(signers: Signers): Contracts {
        this.signers = signers;
        const contractsOwner = this.signers.owner;
        // get instances of external contracts
        this.setExternalTokensInstances()

        // None upgradable contracts
        this.initTokens();

        // Upgradable contracts
        this.initArchimedesUpgradableContracts();

        // Upgradable contracts with constructor arguments
        this.vault = await this.deployContractProxy("VaultOUSD", [ValueStore.addressOUSD, "VaultOUSD", "VOUSD"]);

        Logger.log("Finished deploying contracts\n");
        return this;
    }

    async initTokens(treasuryAddress = this.signers.treasury.address) {
        // None upgradable contracts
        this.lvUSD = await this.deployContract("LvUSDToken");
        // Notice the argument passed to constructor is the treasury address (where all arch tokens are minted)
        this.archToken = await this.deployContract("ArchToken", treasuryAddress);
    }

    async setTokensInstances(lvUSDAddress: string, archTokenAddress: string) {
        this.lvUSD = await this.getInstanceOfExistingContract("LvUSDToken", lvUSDAddress);
        this.archToken = await this.getInstanceOfExistingContract("ArchToken", archTokenAddress);
    }

    async initArchimedesUpgradableContracts() {
        this.parameterStore = await this.deployContractProxy("ParameterStore");
        this.cdp = await this.deployContractProxy("CDPosition");
        this.coordinator = await this.deployContractProxy("Coordinator");
        this.exchanger = await this.deployContractProxy("Exchanger");
        this.leverageEngine = await this.deployContractProxy("LeverageEngine");
        this.positionToken = await this.deployContractProxy("PositionToken");
        this.poolManager = await this.deployContractProxy("PoolManager");
        this.auction = await this.deployContractProxy("Auction");
        this.zapper = await this.deployContractProxy("Zapper");
    }

    async setArchimedesUpgradableContractsInstances(
        parameterStoreAddress: string,
        cdpAddress: string,
        coordinatorAddress: string,
        exchangerAddress: string,
        leverageEngineAddress: string,
        positionTokenAddress: string,
        poolManagerAddress: string,
        auctionAddress: string,
        zapperAddress: string) {

        this.parameterStore = await this.getInstanceOfExistingContract("ParameterStore", parameterStoreAddress);
        this.cdp = await this.getInstanceOfExistingContract("CDPosition", cdpAddress);
        this.coordinator = await this.getInstanceOfExistingContract("Coordinator", coordinatorAddress);
        this.exchanger = await this.getInstanceOfExistingContract("Exchanger", exchangerAddress);
        this.leverageEngine = await this.getInstanceOfExistingContract("LeverageEngine", leverageEngineAddress);
        this.positionToken = await this.getInstanceOfExistingContract("PositionToken", positionTokenAddress);
        this.poolManager = await this.getInstanceOfExistingContract("PoolManager", poolManagerAddress);
        this.auction = await this.getInstanceOfExistingContract("Auction", auctionAddress);
        this.zapper = await this.getInstanceOfExistingContract("Zapper", zapperAddress);
    }

    async initArchimedesUpgradableContractsWithConstructorArguments() {
        this.vault = await this.deployContractProxy("VaultOUSD", [ValueStore.addressOUSD, "VaultOUSD", "VOUSD"]);
    }

    async setArchimedesUpgradableContractsInstancesWithConstructorArguments(
        vaultAddress: string
    ) {
        this.vault = await this.getInstanceOfExistingContract("VaultOUSD", vaultAddress);
    }

    async setExternalTokensInstances() {
        const contractsOwner = this.signers.owner;
        this.externalOUSD = new ethers.Contract(ValueStore.addressOUSD, ValueStore.abiOUSDToken, contractsOwner);
        this.externalUSDT = new ethers.Contract(ValueStore.addressUSDT, ValueStore.abiUSDTToken, contractsOwner);
        this.externalDAI = new ethers.Contract(ValueStore.addressDAI, ValueStore.abiUSDTToken, contractsOwner);
        this.external3CRV = new ethers.Contract(ValueStore.address3CRV, ValueStore.abi3CRVToken, contractsOwner);
    }

    async deployContractProxy(name: string, ...args: Array<any>): Promise<Contract> {
        const factory = await ethers.getContractFactory(name)
        const contract = await hre.upgrades.deployProxy(factory, ...args, { kind: "uups" });
        Logger.log("Deployed " + name + " contract at address " + contract.address);
        return contract;
    };

    async deployContract(name: string, ...args: Array<any>): Contract {
        const factory = await ethers.getContractFactory(name);
        const contract = await factory.deploy(...args);
        Logger.log("Deployed " + name + " contract at address " + contract.address);
        return contract;
    }

    async getInstanceOfExistingContract(name: string, address: string): Contract {
        const factory = await ethers.getContractFactory(name);
        const contract = factory.attach(address);
        Logger.log("Retrieved " + name + " contract at address " + contract.address);
        return contract;
    }
}


