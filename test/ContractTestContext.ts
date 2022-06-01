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
    ParameterStore,
    ArchToken,
} from "../types/contracts";
import type { LvUSDToken } from "../types/contracts/LvUSDToken";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

type DefaultRoles = {
    executive: string,
    governor: string,
    guardian: string,
};

type ContractRoles = {
    admin?: SignerWithAddress;
    [contractKey: string]: Partial<DefaultRoles> | SignerWithAddress | undefined;
};

type ContractConstructorArgs = any[];
type ContractMap = {
    [contractKey: string]: ContractConstructorArgs;
}

function capitalizeFirstLetter (str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* Return object matching contractMap keys with deployed contract objects. contractMap values should be
   an array where first item is path to contract and remaining items are constructor args to pass. First
   argument to contructor will be admin address which is expected by AccessController */
async function deployContracts <T> (contractMap: ContractMap, addressAdmin: string): Promise<T> {
    const contracts = {};
    await Promise.all(Object.entries(contractMap).map(async ([contractKey, constructorArgs]) => {
        const factory = await ethers.getContractFactory(capitalizeFirstLetter(contractKey));
        const contract = await factory.deploy(addressAdmin, ...constructorArgs);
        contracts[contractKey] = contract;
    }));
    return contracts as T;
}

type ArchContracts = {
    archToken: ArchToken;
    cDPosition: CDPosition;
    coordinator: Coordinator;
    exchanger: Exchanger;
    leverageAllocator: LeverageAllocator;
    leverageEngine: LeverageEngine;
    lvUSDToken: LvUSDToken;
    parameterStore: ParameterStore;
    positionToken: PositionToken;
    vaultOUSD: VaultOUSD;
};

export type ContractTestContext = ArchContracts & {
    owner: SignerWithAddress;
    addr1: SignerWithAddress;
    addr2: SignerWithAddress;
    addr3: SignerWithAddress;
    treasurySigner: SignerWithAddress;
    // External contracts
    externalOUSD: Contract;
    externalUSDT: Contract;
    external3CRV: Contract;
    curveLvUSDPool: Contract;
}

export const signers = ethers.getSigners();
export const ownerStartingLvUSDAmount = ethers.utils.parseUnits("1000.0");

/* reset the network and rebuild and deploy all contracts. accepts contractRoleOverrides which can specify
   an overriden admin address for all contracts or individual roles per contract */
export async function buildContractTestContext (contractRoleOverrides: ContractRoles = {}): Promise<ContractTestContext> {
    await helperResetNetwork(defaultBlockNumber);

    const context = {} as ContractTestContext;

    [context.owner, context.addr1, context.addr2, context.treasurySigner, context.addr3] = await signers;

    context.externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, context.owner);
    context.externalUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, context.owner);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    context.external3CRV = new ethers.Contract(address3CRV, abi3CRVToken, context.owner);

    const signerAdmin = contractRoleOverrides.admin || context.owner;
    const contracts = await deployContracts<ArchContracts>({
        archToken: [context.owner.address],
        cDPosition: [],
        coordinator: [],
        exchanger: [],
        leverageAllocator: [],
        leverageEngine: [],
        lvUSDToken: [],
        parameterStore: [],
        positionToken: [],
        vaultOUSD: [context.externalOUSD.address, "VaultOUSD", "VOUSD"],
    }, signerAdmin.address);
    Object.assign(context, contracts);

    // Give context.owner some funds:
    await context.lvUSDToken.mint(context.owner.address, ownerStartingLvUSDAmount);
    await helperSwapETHWith3CRV(context.owner, ethers.utils.parseUnits("3.0"));

    // Create a LVUSD3CRV pool and fund with "fundedPoolAmount" of each token
    context.curveLvUSDPool = await createAndFundMetapool(context.owner, context);
    // Setup pool with approval
    await context.lvUSDToken.approve(context.curveLvUSDPool.address, ownerStartingLvUSDAmount);

    await context.lvUSDToken.approve(context.exchanger.address, ethers.constants.MaxUint256);
    await context.lvUSDToken.approve(context.coordinator.address, ethers.constants.MaxUint256);

    /* expected contract roles when deployed to mainnet: */
    const contractRoles = {
        positionToken: {
            executive: context.leverageEngine.address,
        },
    };

    const initArgs = {
        leverageEngine: [
            context.coordinator.address,
            context.positionToken.address,
            context.parameterStore.address,
            context.leverageAllocator.address,
            context.externalOUSD.address,
        ],
        coordinator: [
            context.lvUSDToken.address,
            context.vaultOUSD.address,
            context.cDPosition.address,
            context.externalOUSD.address,
            context.exchanger.address,
            context.parameterStore.address,
        ],
        exchanger: [
            context.parameterStore.address,
            context.coordinator.address,
            context.lvUSDToken.address,
            context.externalOUSD.address,
            context.external3CRV.address,
            context.curveLvUSDPool.address,
            addressCurveOUSDPool,
        ],
        vaultOUSD: [context.parameterStore.address, context.externalOUSD.address],
        parameterStore: [context.treasurySigner.address],
    };

    /* call setRoles and init on all contracts, allowing any specified overrides from arguments: */
    await Promise.all(Object.entries(contracts).map(async ([contractKey, contract]) => {
        const roles = {
            /* these defaults are temporary while  */
            executive: context.owner.address,
            governor: context.owner.address,
            guardian: context.owner.address,
            ...contractRoles[contractKey],
            /* contractRoleOverrides allow tests to pass in an address override to make role based testing more clear */
            ...contractRoleOverrides[contractKey] as Partial<DefaultRoles>,
        };
        await contract.connect(signerAdmin).setRoles(roles.executive, roles.governor, roles.guardian);
        const args: string[] = initArgs[contractKey] || [] as const;
        await contract.connect(signerAdmin).init(args);
    }));

    return context;
}
