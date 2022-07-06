import { Contract } from "ethers";
import { ethers } from "hardhat";
import {
    addressOUSD, abiOUSDToken,
    addressUSDT, abiUSDTToken,
    address3CRV, abi3CRVToken,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV,
    helperResetNetwork,
    defaultBlockNumber,
} from "./MainnetHelper";
import { createAndFundMetapool } from "./CurveHelper";
import type {
    ArchToken,
} from "../types/contracts";
import type { LvUSDToken } from "../types/contracts/LvUSDToken";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

type DefaultRoles = {
    admin: string,
    executive: string,
    governor: string,
    guardian: string,
};

type ContractRoles = {
    [contractKey: string]: Partial<DefaultRoles>;
};

type ContractRolesWithDefaults = {
    [contractKey: string]: Partial<DefaultRoles>;
    defaults: DefaultRoles & ContractRoles;
};

type ContractPath = string;
type ContractConstructorArgs = any[];
type ContractMap = {
    [contractKey: string]: [ContractPath, ...ContractConstructorArgs];
}

/* Return object matching contractMap keys with deployed contract objects. contractMap values should be
   an array where first item is path to contract and remaining items are constructor args to pass. First
   argument to contructor will be admin address which is expected by AccessController */
async function deployContracts <T> (contractMap: ContractMap, contractRoles: ContractRolesWithDefaults): Promise<T> {
    const contracts = {};
    await Promise.all(Object.entries(contractMap).map(async ([contractKey, [contractPath, ...constructorArgs]]) => {
        const factory = await ethers.getContractFactory(contractPath);
        const overrideRoles = contractRoles[contractPath];
        const addressAdmin = (overrideRoles && overrideRoles.admin) || contractRoles.defaults.admin;
        const contract = await factory.deploy(addressAdmin, ...constructorArgs);
        contracts[contractKey] = contract;
    }));
    return contracts as T;
}

type ArchContracts = {
    archToken: ArchToken;
    lvUSD: LvUSDToken;
    // parameterStore: ParameterStore;
};

export type ContractTestContext = ArchContracts & {
    owner: SignerWithAddress;
    addr1: SignerWithAddress;
    addr2: SignerWithAddress;
    addr3: SignerWithAddress;
    treasurySigner: SignerWithAddress;
    // Archimedes contracts
    // TODO - how to make this type of parameterStore? Failing when I just set it :(
    parameterStore: Contract;
    cdp: Contract;
    coordinator: Contract;
    exchanger: Contract;
    leverageEngine: Contract;
    positionToken: Contract;
    vault: Contract;
    // External contracts
    externalOUSD: Contract;
    externalUSDT: Contract;
    external3CRV: Contract;
    curveLvUSDPool: Contract;
}

export const signers = ethers.getSigners();
export const ownerStartingLvUSDAmount = ethers.utils.parseUnits("1000.0");

export async function buildContractTestContext (contractRoles: ContractRoles = {}): Promise<ContractTestContext> {
    await helperResetNetwork(defaultBlockNumber);

    const context = {} as ContractTestContext;

    [context.owner, context.addr1, context.addr2, context.treasurySigner, context.addr3] = await signers;

    const contractRolesWithDefaults = {
        defaults: {
            admin: context.owner.address,
            executive: context.owner.address,
            governor: context.owner.address,
            guardian: context.owner.address,
        },
        ...contractRoles,
    } as ContractRolesWithDefaults;

    context.externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, context.owner);
    context.externalUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, context.owner);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    context.external3CRV = new ethers.Contract(address3CRV, abi3CRVToken, context.owner);

    const paramStoreFactory = await ethers.getContractFactory("ParameterStore");
    context.parameterStore = await paramStoreFactory.deploy();

    const cdpFactory = await ethers.getContractFactory("CDPosition");
    context.cdp = await cdpFactory.deploy();

    const coordinatorFactory = await ethers.getContractFactory("Coordinator");
    context.coordinator = await coordinatorFactory.deploy();

    const exchangerFactory = await ethers.getContractFactory("Exchanger");
    context.exchanger = await exchangerFactory.deploy();

    const leverageEngineFactory = await ethers.getContractFactory("LeverageEngine");
    context.leverageEngine = await leverageEngineFactory.deploy();

    const positionTokenFactory = await ethers.getContractFactory("PositionToken");
    context.positionToken = await positionTokenFactory.deploy();

    const vaultFactory = await ethers.getContractFactory("VaultOUSD");
    context.vault = await vaultFactory.deploy();

    /// TODO: depracate this here in each test as we move away accessController
    const contracts = await deployContracts<ArchContracts>({
        archToken: ["ArchToken"],
        lvUSD: ["LvUSDToken"],
    }, contractRolesWithDefaults);
    Object.assign(context, contracts);

    /* temporary list, in the future will just iterate over all contracts: */
    /* if contracts have derrived role addresses they should exist under their contract name
       on defaults. defaults should be the expected final roles when deployed to mainnet: */
    contractRolesWithDefaults.defaults.PositionToken = {
        executive: context.leverageEngine.address,
    };

    // Give context.owner some funds:
    // expecting minter to be owner
    await context.lvUSD.setMintDestination(context.owner.address);
    await context.lvUSD.mint(ownerStartingLvUSDAmount);
    await helperSwapETHWith3CRV(context.owner, ethers.utils.parseUnits("3.0"));

    // Create a LVUSD3CRV pool and fund with "fundedPoolAmount" of each token
    context.curveLvUSDPool = await createAndFundMetapool(context.owner, context);
    // Setup pool with approval
    await context.lvUSD.approve(context.curveLvUSDPool.address, ownerStartingLvUSDAmount);

    await context.lvUSD.approve(context.exchanger.address, ethers.constants.MaxUint256);
    await context.lvUSD.approve(context.coordinator.address, ethers.constants.MaxUint256);

    // Post init contracts
    await Promise.all([
        context.leverageEngine.initialize(),
        context.leverageEngine.setDependencies(
            context.coordinator.address,
            context.positionToken.address,
            context.parameterStore.address,
            context.archToken.address,
            context.externalOUSD.address,
        ),

        context.coordinator.initialize(),
        context.coordinator.setDependencies(
            context.lvUSD.address,
            context.vault.address,
            context.cdp.address,
            context.externalOUSD.address,
            context.exchanger.address,
            context.parameterStore.address,
        ),

        context.exchanger.initialize(),
        context.exchanger.setDependencies(
            context.parameterStore.address,
            context.coordinator.address,
            context.lvUSD.address,
            context.externalOUSD.address,
            context.external3CRV.address,
            context.curveLvUSDPool.address,
            addressCurveOUSDPool,
        ),
        context.vault.initialize(context.externalOUSD.address, "VaultOUSD", "VOUSD"),
        context.vault.setDependencies(context.parameterStore.address, context.externalOUSD.address),

        context.parameterStore.initialize(),
        context.parameterStore.changeTreasuryAddress(context.treasurySigner.address),
        context.positionToken.initialize(),
    ]);

    return context;
}
