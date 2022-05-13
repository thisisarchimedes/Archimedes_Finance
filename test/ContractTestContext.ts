import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { addressOUSD, abiOUSDToken } from "./MainnetHelper";
import type {
    Coordinator,
    CDPosition,
    VaultOUSD,
    Exchanger,
    LeverageEngine,
    LeverageAllocator,
    PositionToken,
    ParameterStore,
} from "../types/contracts";
import type { LvUSDToken } from "../types/contracts/LvUsdToken.sol";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function getContractFactories (factoryNames: string[]): Promise<{ [K: string]: ContractFactory }> {
    const contracts = await Promise.all(
        factoryNames.map(factoryName => ethers.getContractFactory(factoryName)),
    );
    return factoryNames.reduce((acc, factoryName, i) => ({
        ...acc,
        [factoryName]: contracts[i],
    }), {});
}

export type ContractTestContext = {
    coordinator: Coordinator;
    owner: SignerWithAddress;
    addr1: SignerWithAddress;
    addr2: SignerWithAddress;
    addr3: SignerWithAddress;
    treasurySigner: SignerWithAddress;
    // Archimedes deployed contract instances
    cdp: CDPosition;
    vault: VaultOUSD;
    lvUSD: LvUSDToken;
    exchanger: Exchanger;
    leverageEngine: LeverageEngine;
    leverageAllocator: LeverageAllocator;
    positionToken: PositionToken;
    parameterStore: ParameterStore;
    // External contracts
    externalOUSD: Contract;
}

export async function buildContractTestContext (): Promise<ContractTestContext> {
    const context = {} as ContractTestContext;

    [context.owner, context.addr1, context.addr2, context.treasurySigner, context.addr3] = await ethers.getSigners();

    const contracts = await getContractFactories([
        "CDPosition",
        "Exchanger",
        "LeverageEngine",
        "LeverageAllocator",
        "PositionToken",
        "ParameterStore",
        "VaultOUSD",
        "LvUSDToken",
        "Coordinator",
    ]);

    context.externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, context.owner);

    [
        context.cdp,
        context.exchanger,
        context.leverageEngine,
        context.leverageAllocator,
        context.positionToken,
        context.parameterStore,
        context.vault,
        context.lvUSD,
        context.coordinator,
    ] = await Promise.all([
        contracts.CDPosition.deploy(),
        contracts.Exchanger.deploy(),
        contracts.LeverageEngine.deploy(context.owner.address),
        contracts.LeverageAllocator.deploy(context.owner.address),
        contracts.PositionToken.deploy(),
        contracts.ParameterStore.deploy(),
        contracts.VaultOUSD.deploy(context.externalOUSD.address, "VaultOUSD", "VOUSD"),
        contracts.LvUSDToken.deploy(),
        contracts.Coordinator.deploy(),
    ]) as [
        CDPosition,
        Exchanger,
        LeverageEngine,
        LeverageAllocator,
        PositionToken,
        ParameterStore,
        VaultOUSD,
        LvUSDToken,
        Coordinator
    ];

    // Post init contracts
    await Promise.all([
        context.leverageEngine.init(
            context.coordinator.address,
            context.positionToken.address,
            context.parameterStore.address,
            context.leverageAllocator.address,
        ),
        context.exchanger.init(context.lvUSD.address, context.coordinator.address, context.externalOUSD.address),
        context.coordinator.init(
            context.lvUSD.address,
            context.vault.address,
            context.cdp.address,
            context.externalOUSD.address,
            context.exchanger.address,
            context.parameterStore.address,
        ),
        context.vault.init(context.parameterStore.address, context.externalOUSD.address),
        context.parameterStore.init(context.treasurySigner.address),
    ]);

    return context;
}
