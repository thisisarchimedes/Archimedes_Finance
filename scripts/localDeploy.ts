import hre, { ethers } from "hardhat";
import { Contract } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { abilvUSD, abiArchToken, abilvUSD3CRVPool, abiUSDC, abiZap } from "../test/ABIs";
import {
    addressOUSD, abiOUSDToken,
    addressUSDT, abiUSDTToken,
    address3CRV, abi3CRVToken,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV,
    helperResetNetwork,
    defaultBlockNumber, address3CRVlvUSDPool,
} from "../test/MainnetHelper";
import { ContractTestContext } from "../test/ContractTestContext";
import {
    addressArchToken, addressTreasury,
    impersonateAccount, fundAccount, stopImpersonate, addresslvUSDToken,
} from "../integrationTests/IntegrationTestContext";

import { createAndFundMetapool } from "../test/CurveHelper";

export const signers = ethers.getSigners();

let context;

const About4700ETH = "0x1000000000000000000";

const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";

const fundLVUSD = async () => {
    const amount = "10000";
    const [owner, addr1, addr2, treasurySigner, addr3] = await signers;

    // grab lvUSD token contract
    // const contractlvUSDToken = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

    // grab lvUSD admin address
    const signerlvUSDAdmin = await impersonateAccount(addresslvUSDAdmin);
    fundAccount(addresslvUSDAdmin, About4700ETH);

    // grab lvUSD minter address
    const signerlvUSDMinter = await impersonateAccount(addresslvUSDMinter);
    fundAccount(addresslvUSDMinter, About4700ETH);

    await context.lvUSD.connect(signerlvUSDAdmin).setMintDestination(owner.address);
    await context.lvUSD.connect(signerlvUSDMinter).mint(ethers.utils.parseUnits(amount, 18));

    console.log(truncateEthAddress(owner.address) + " funded with " + amount + " LVUSD");
};

const fundARCH = async () => {
    const amount = "10000";
    const [owner, addr1, addr2, treasurySigner, addr3] = await signers;

    // const contractArchToken = await ethers.getContractAt(abiArchToken, addressArchToken);
    // context.archToken = contractArchToken;
    // treasury owns all ARCH
    const signerTreasury = await impersonateAccount(addressTreasury);
    fundAccount(addressTreasury, About4700ETH);

    await context.archToken.connect(signerTreasury).transfer(owner.address, ethers.utils.parseUnits(amount, 18));

    console.log(truncateEthAddress(owner.address) + " funded with " + amount + " ARCH");
};

const cleanup = async () => {
    await stopImpersonate(addresslvUSDMinter);
    await stopImpersonate(addresslvUSDAdmin);
};

const truncateEthAddress = (address: string) => {
    const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;
    const match = address.match(truncateRegex);
    if (!match) return address;
    return `${match[1]}…${match[2]}`;
};

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

    const poolManagerFactory = await ethers.getContractFactory("PoolManager");
    context.poolManager = await hre.upgrades.deployProxy(poolManagerFactory, [], { kind: "uups" });

    context.lvUSD = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

    context.archToken = await ethers.getContractAt(abiArchToken, addressArchToken);

    context.curveLvUSDPool = await ethers.getContractAt(abilvUSD3CRVPool, address3CRVlvUSDPool);

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
            context.poolManager.address,
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

        context.poolManager.setDependencies(
            context.parameterStore.address,
            context.coordinator.address,
            context.lvUSD.address,
            context.external3CRV.address,
            context.curveLvUSDPool.address),
    ]);

    return context;
}
// async function setupArchimedesContracts () {
//     [context.owner, context.addr1, context.addr2, context.treasurySigner, context.addr3] = await signers;

//     context.externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, context.owner);
//     context.externalUSDT = new ethers.Contract(addressUSDT, abiUSDTToken, context.owner);
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     context.external3CRV = new ethers.Contract(address3CRV, abi3CRVToken, context.owner);

//     const paramStoreFactory = await ethers.getContractFactory("ParameterStore");
//     context.parameterStore = await hre.upgrades.deployProxy(paramStoreFactory, [], { kind: "uups" });

//     const cdpFactory = await ethers.getContractFactory("CDPosition");
//     context.cdp = await hre.upgrades.deployProxy(cdpFactory, [], { kind: "uups" });

//     const coordinatorFactory = await ethers.getContractFactory("Coordinator");
//     context.coordinator = await hre.upgrades.deployProxy(coordinatorFactory, [], { kind: "uups" });

//     const exchangerFactory = await ethers.getContractFactory("Exchanger");
//     context.exchanger = await hre.upgrades.deployProxy(exchangerFactory, [], { kind: "uups" });

//     const leverageEngineFactory = await ethers.getContractFactory("LeverageEngine");
//     context.leverageEngine = await hre.upgrades.deployProxy(leverageEngineFactory, [], { kind: "uups" });

//     const positionTokenFactory = await ethers.getContractFactory("PositionToken");
//     context.positionToken = await hre.upgrades.deployProxy(positionTokenFactory, [], { kind: "uups" });

//     const vaultFactory = await ethers.getContractFactory("VaultOUSD");
//     context.vault = await hre.upgrades.deployProxy(vaultFactory, [context.externalOUSD.address, "VaultOUSD", "VOUSD"], { kind: "uups" });

//     const poolManagerFactory = await ethers.getContractFactory("PoolManager");
//     context.poolManager = await hre.upgrades.deployProxy(poolManagerFactory, [], { kind: "uups" });

//     // Give context.owner some funds:
//     // expecting minter to be owner
//     const ownerStartingLvUSDAmount = ethers.utils.parseUnits("1000.0");
//     await context.lvUSD.setMintDestination(context.owner.address);
//     await context.lvUSD.mint(ownerStartingLvUSDAmount);
//     await helperSwapETHWith3CRV(context.owner, ethers.utils.parseUnits("3.0"));

//     // Create a LVUSD3CRV pool and fund with "fundedPoolAmount" of each token
//     context.curveLvUSDPool = await createAndFundMetapool(context.owner, context);
//     // Setup pool with approval
//     await context.lvUSD.approve(context.curveLvUSDPool.address, ownerStartingLvUSDAmount);

//     await context.lvUSD.approve(context.exchanger.address, ethers.constants.MaxUint256);
//     await context.lvUSD.approve(context.coordinator.address, ethers.constants.MaxUint256);

//     // setup Dependencies
//     await Promise.all([
//         context.leverageEngine.setDependencies(
//             context.coordinator.address,
//             context.positionToken.address,
//             context.parameterStore.address,
//             context.archToken.address,
//             context.externalOUSD.address,
//         ),

//         context.coordinator.setDependencies(
//             context.lvUSD.address,
//             context.vault.address,
//             context.cdp.address,
//             context.externalOUSD.address,
//             context.exchanger.address,
//             context.parameterStore.address,
//             context.poolManager.address,
//         ),

//         context.exchanger.setDependencies(
//             context.parameterStore.address,
//             context.coordinator.address,
//             context.lvUSD.address,
//             context.externalOUSD.address,
//             context.external3CRV.address,
//             context.curveLvUSDPool.address,
//             addressCurveOUSDPool,
//         ),
//         context.vault.setDependencies(context.parameterStore.address, context.externalOUSD.address),

//         context.parameterStore.changeTreasuryAddress(context.treasurySigner.address),

//         context.poolManager.setDependencies(
//             context.parameterStore.address,
//             context.coordinator.address,
//             context.lvUSD.address,
//             context.external3CRV.address,
//             context.curveLvUSDPool.address),
//     ]);
//     // setup roles correctly
//     await context.coordinator.setExecutive(context.leverageEngine.address);
//     await context.positionToken.setExecutive(context.leverageEngine.address);

//     await context.exchanger.setExecutive(context.coordinator.address);
//     await context.vault.setExecutive(context.coordinator.address);
//     await context.cdp.setExecutive(context.coordinator.address);
// }

async function verifyDeployment () {
    console.log("ParamStore value rebaseFeeRate = %s", await context.parameterStore.getRebaseFeeRate());
}
const deployScript = async () => {
    context = await buildContractTestContext();
    await fundLVUSD();
    await fundARCH();
    // await setupArchimedesContracts();
    await verifyDeployment();
    await cleanup();
};

deployScript();
