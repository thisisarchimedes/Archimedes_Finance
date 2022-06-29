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
    Coordinator,
    CDPosition,
    VaultOUSD,
    Exchanger,
    LeverageEngine,
    LeverageAllocator,
    PositionToken,
    // ParameterStore,
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
    cdp: CDPosition;
    coordinator: Coordinator;
    exchanger: Exchanger;
    leverageAllocator: LeverageAllocator;
    leverageEngine: LeverageEngine;
    lvUSD: LvUSDToken;
    // parameterStore: ParameterStore;
    positionToken: PositionToken;
    vault: VaultOUSD;
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

    /// TODO: depracate this here in each test as we move away accessController
    const contracts = await deployContracts<ArchContracts>({
        archToken: ["ArchToken"],
        cdp: ["CDPosition"],
        coordinator: ["Coordinator"],
        exchanger: ["Exchanger"],
        leverageAllocator: ["LeverageAllocator"],
        leverageEngine: ["LeverageEngine"],
        lvUSD: ["LvUSDToken"],
        // parameterStore: ["ParameterStore"],
        positionToken: ["PositionToken"],
        vault: ["VaultOUSD", context.externalOUSD.address, "VaultOUSD", "VOUSD"],
    }, contractRolesWithDefaults);
    Object.assign(context, contracts);

    /* temporary list, in the future will just iterate over all contracts: */
    const contractsWithRoles = [context.positionToken];
    /* if contracts have derrived role addresses they should exist under their contract name
       on defaults. defaults should be the expected final roles when deployed to mainnet: */
    contractRolesWithDefaults.defaults.PositionToken = {
        executive: context.leverageEngine.address,
    };
    /* call setRoles on all contracts, allowing any specified overrides from arguments: */
    await Promise.all(contractsWithRoles.map(async (contract) => {
        const contractName = await contract.name();
        const roles = {
            ...contractRolesWithDefaults.defaults,
            ...contractRolesWithDefaults.defaults[contractName],
            /* contractRoles allow tests to pass in an alternative address to make role based testing more concise and clear */
            ...contractRolesWithDefaults[contractName],
        };
        return contract.setRoles(roles.executive, roles.governor, roles.guardian);
    }));

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
        context.leverageEngine.init(
            context.coordinator.address,
            context.positionToken.address,
            context.parameterStore.address,
            context.archToken.address,
            context.externalOUSD.address,
        ),

        context.coordinator.init(
            context.lvUSD.address,
            context.vault.address,
            context.cdp.address,
            context.externalOUSD.address,
            context.exchanger.address,
            context.parameterStore.address,
        ),

        context.exchanger.init(
            context.parameterStore.address,
            context.coordinator.address,
            context.lvUSD.address,
            context.externalOUSD.address,
            context.external3CRV.address,
            context.curveLvUSDPool.address,
            addressCurveOUSDPool,
        ),

        context.vault.init(context.parameterStore.address, context.externalOUSD.address),
        context.parameterStore.init(context.treasurySigner.address, context.owner.address),
        context.positionToken.init(),
    ]);

    return context;
}
