import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { Contract } from "@nomiclabs/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import { Signers } from "./Signers";
import { Coordinator } from "../../types/contracts/Coordinator";
import { Exchanger } from "../../types/contracts/Exchanger";
import { LeverageEngine } from "../../types/contracts/LeverageEngine";
import { PositionToken } from "../../types/contracts/PositionToken";
import { Vault } from "../../types/contracts/Vault";
import { ArchToken } from "../../types/contracts/ArchToken";
import { LvUSDToken } from "../../types/contracts/LvUSDToken";
import { PoolManager } from "../../types/contracts/PoolManager";
import { Auction } from "../../types/contracts/Auction";
import { Zapper } from "../../types/contracts/Zapper";
import { IERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/IERC20";
import { ICurveFiCurveInterface } from "../../types/contracts/interfaces/ICurveFi/ICurveFiCurve";
import { ValueStore } from "./ValueStore";
import { Logger } from "./Logger";

export class Contracts {
    // Signer that owns contract
    signers: Signers;
    /// Contracts 
    coordinator: Coordinator;
    exchanger: Exchanger;
    leverageEngine: LeverageEngine;
    positionToken: PositionToken;
    vault: Vault;
    archToken: ArchToken;
    lvUSD: LvUSDToken;
    poolManager: PoolManager;
    auction: Auction;
    zapper: Zapper;

    // External contracts
    externalOUSD: IERC20;
    externalUSDT: IERC20;
    externalDAI: IERC20;
    external3CRV: IERC20;
    // curveLvUSDPool: ICurveFiCurveInterface;


    async init(signers: Signers): Contracts {
        this.signers = signers;
        const contractsOwner = this.signers.owner;
        // get instances of external contracts
        this.externalOUSD = new ethers.Contract(ValueStore.addressOUSD, ValueStore.abiOUSDToken, contractsOwner);
        this.externalUSDT = new ethers.Contract(ValueStore.addressUSDT, ValueStore.abiUSDTToken, contractsOwner);
        this.externalDAI = new ethers.Contract(ValueStore.addressDAI, ValueStore.abiUSDTToken, contractsOwner);
        this.external3CRV = new ethers.Contract(ValueStore.address3CRV, ValueStore.abi3CRVToken, contractsOwner);
        console.log("external3CRV: ", this.external3CRV.address);
        // None upgradable contracts
        this.lvUSD = await this.deployContract("LvUSDToken", contractsOwner.address);
        this.archToken = await this.deployContract("ArchToken", contractsOwner.address);
        // Upgradable contracts
        this.coordinator = await this.deployContractProxy("Coordinator");
        this.exchanger = await this.deployContractProxy("Exchanger");
        this.leverageEngine = await this.deployContractProxy("LeverageEngine");
        this.positionToken = await this.deployContractProxy("PositionToken");
        this.poolManager = await this.deployContractProxy("PoolManager");
        this.auction = await this.deployContractProxy("Auction");
        this.zapper = await this.deployContractProxy("Zapper");
        // Upgradable contracts with constructor arguments
        this.vault = await this.deployContractProxy("VaultOUSD", [ValueStore.addressOUSD, "VaultOUSD", "VOUSD"]);
        return this;
    }

    async deployContractProxy(name: String, ...args: Array<any>): Promise<Contract> {
        const factory = await ethers.getContractFactory(name)
        const contract = await hre.upgrades.deployProxy(factory, ...args, { kind: "uups" });
        Logger.log("Deployed " + name + " contract at address " + contract.address);
        return contract;
    };

    async deployContract(name: String, ...args: Array<any>): Contract {
        const factory = await ethers.getContractFactory(name);
        const contract = await factory.deploy(...args);
        Logger.log("Deployed " + name + " contract at address " + contract.address);
        return contract;
    }
}