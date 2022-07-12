import { BigNumber, Contract } from "ethers";
import hre, { ethers } from "hardhat";
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
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export type ContractTestContext ={
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
    archToken: Contract;
    lvUSD: Contract;
    // External contracts
    externalOUSD: Contract;
    externalUSDT: Contract;
    external3CRV: Contract;
    curveLvUSDPool: Contract;
}

export async function setRolesForEndToEnd (r:ContractTestContext) {
    await r.coordinator.setExecutive(r.leverageEngine.address);
    await r.positionToken.setExecutive(r.leverageEngine.address);

    await r.exchanger.setExecutive(r.coordinator.address);
    await r.vault.setExecutive(r.coordinator.address);
    await r.cdp.setExecutive(r.coordinator.address);
}
export const signers = ethers.getSigners();
export const ownerStartingLvUSDAmount = ethers.utils.parseUnits("1000.0");
export async function buildContractTestContext (): Promise<ContractTestContext> {
    await helperResetNetwork(defaultBlockNumber);

    const context = {} as ContractTestContext;

    [context.owner, context.addr1, context.addr2, context.treasurySigner, context.addr3] = await signers;

    context.externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, context.owner);
    context.externalUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, context.owner);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    context.external3CRV = new ethers.Contract(address3CRV, abi3CRVToken, context.owner);

    const paramStoreFactory = await ethers.getContractFactory("ParameterStore");
    context.parameterStore = await hre.upgrades.deployProxy(paramStoreFactory, [], { kind: "uups" });

    const cdpFactory = await ethers.getContractFactory("CDPosition");
    context.cdp = await hre.upgrades.deployProxy(cdpFactory, [], { kind: "uups" });

    const coordinatorFactory = await ethers.getContractFactory("Coordinator");
    context.coordinator = await hre.upgrades.deployProxy(coordinatorFactory, [], { kind: "uups" });

    const exchangerFactory = await ethers.getContractFactory("Exchanger");
    context.exchanger = await hre.upgrades.deployProxy(exchangerFactory, [], { kind: "uups" });

    const leverageEngineFactory = await ethers.getContractFactory("LeverageEngine");
    context.leverageEngine = await hre.upgrades.deployProxy(leverageEngineFactory, [], { kind: "uups" });

    const positionTokenFactory = await ethers.getContractFactory("PositionToken");
    context.positionToken = await hre.upgrades.deployProxy(positionTokenFactory, [], { kind: "uups" });

    const vaultFactory = await ethers.getContractFactory("VaultOUSD");
    context.vault = await hre.upgrades.deployProxy(vaultFactory, [context.externalOUSD.address, "VaultOUSD", "VOUSD"], { kind: "uups" });

    const archTokenfactory = await ethers.getContractFactory("ArchToken");
    context.archToken = await archTokenfactory.deploy(context.treasurySigner.address);

    const lvUSDfactory = await ethers.getContractFactory("LvUSDToken");
    context.lvUSD = await lvUSDfactory.deploy(context.owner.address);

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

    // await setRolesForEndToEnd(context);

    // Post init contracts
    await Promise.all([
        context.leverageEngine.setDependencies(
            context.coordinator.address,
            context.positionToken.address,
            context.parameterStore.address,
            context.archToken.address,
            context.externalOUSD.address,
        ),

        context.coordinator.setDependencies(
            context.lvUSD.address,
            context.vault.address,
            context.cdp.address,
            context.externalOUSD.address,
            context.exchanger.address,
            context.parameterStore.address,
        ),

        context.exchanger.setDependencies(
            context.parameterStore.address,
            context.coordinator.address,
            context.lvUSD.address,
            context.externalOUSD.address,
            context.external3CRV.address,
            context.curveLvUSDPool.address,
            addressCurveOUSDPool,
        ),
        context.vault.setDependencies(context.parameterStore.address, context.externalOUSD.address),

        context.parameterStore.changeTreasuryAddress(context.treasurySigner.address),
    ]);

    return context;
}
