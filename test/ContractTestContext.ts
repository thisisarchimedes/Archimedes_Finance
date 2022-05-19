import { Contract, ContractFactory } from "ethers";
import { parseEther, formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
    addressOUSD, abiOUSDToken,
    addressUSDT, abiUSDTToken,
    address3CRV, abi3CRVToken,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV,
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
} from "../types/contracts";
import type { LvUSDToken } from "../types/contracts/LvUSDToken";
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
    externalUSDT: Contract;
    external3CRV: Contract;
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
    context.externalUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, context.owner);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    context.external3CRV = new ethers.Contract(address3CRV, abi3CRVToken, context.owner);

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
        contracts.PositionToken.deploy(context.owner.address),
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

    // Give owner some tokens
    await context.lvUSD.mint(context.owner.address, ethers.utils.parseEther("1000.0"));
    await helperSwapETHWith3CRV(context.owner, ethers.utils.parseEther("3.0"));

    // Create a LVUSD3CRV pool and fund with 200 (hardcoded in CurveHelper) of each token
    const curveLvUSDPool = await createAndFundMetapool(context.owner, context);

    await context.lvUSD.approve(curveLvUSDPool.address, ethers.utils.parseEther("1000"));
    const amntLVUSD = ethers.utils.parseEther("10");
    const min3CRV = ethers.utils.parseEther("1.0");
    await curveLvUSDPool.exchange(0, 1, amntLVUSD, min3CRV, context.owner.address);

    // Post init contracts
    await Promise.all([
        context.leverageEngine.init(
            context.coordinator.address,
            context.positionToken.address,
            context.parameterStore.address,
            context.leverageAllocator.address,
        ),

        context.coordinator.init(
            context.lvUSD.address,
            context.vault.address,
            context.cdp.address,
            context.externalOUSD.address,
            context.exchanger.address,
            context.parameterStore.address,
        ),

        /**
        address addressParameterStore,
        address addressCoordinator,
        address addressLvUSD,
        address addressOUSD,
        address address3CRV,
        address addressPoolLvUSD3CRV,
        address addressPoolOUSD3CRV
         */
        context.exchanger.init(
            context.parameterStore.address,
            context.coordinator.address,
            context.lvUSD.address,
            context.externalOUSD.address,
            context.external3CRV.address,
            curveLvUSDPool.address,
            addressCurveOUSDPool,
        ),

        context.vault.init(context.parameterStore.address, context.externalOUSD.address),
        context.parameterStore.init(context.treasurySigner.address),
        context.positionToken.init(context.leverageEngine.address),
    ]);

    return context;
}
