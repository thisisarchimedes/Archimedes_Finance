import hre, { ethers, network } from "hardhat";

import { Contract } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { abilvUSD, abiArchToken, abilvUSD3CRVPool, abiUSDC, abiZap } from "../test/ABIs";
import {
    addressOUSD, abiOUSDToken,
    addressUSDT, abiUSDTToken,
    address3CRV, abi3CRVToken,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV, helperSwapETHWithOUSD,
    defaultBlockNumber, address3CRVlvUSDPool, addressZap, addressUSDC,
} from "../test/MainnetHelper";
import { ContractTestContext } from "../test/ContractTestContext";
import {
    addressArchToken, addressTreasury,
    impersonateAccount, fundAccount, stopImpersonate, addresslvUSDToken,
} from "../integrationTests/IntegrationTestContext";
import dotenv from "dotenv";

import { createAndFundMetapool } from "../test/CurveHelper";

export const signers = ethers.getSigners();

let context;

const About4700ETH = "0x1000000000000000000";

const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";

async function fundPool () {
    console.log("Funding pool...");
    const About4700 = "0x1000000000000000000";
    const addr1 = "0x55fe002aeff02f77364de339a1292923a15844b8"; // Circle's address
    const signerAddr1 = await impersonateAccount(addr1);
    fundAccount(addr1, About4700);

    const signerlvUSDAdmin = await impersonateAccount(addresslvUSDAdmin);
    fundAccount(addresslvUSDAdmin, About4700);
    const signerlvUSDMinter = await impersonateAccount(addresslvUSDMinter);
    fundAccount(addresslvUSDMinter, About4700);
    console.log("Funding pool... 1 ");

    const tenK18Decimal = ethers.utils.parseUnits("10000", 18);
    const tenK6Decimal = ethers.utils.parseUnits("10000", 6);

    // set lvUSD mint address
    await context.lvUSD.connect(signerlvUSDAdmin).setMintDestination(addr1);
    // mint a bit lvUSD
    await context.lvUSD.connect(signerlvUSDMinter).mint(tenK18Decimal);
    console.log("Funding pool...2");

    // grab some USDC - addr1 is Circle's so it has a lot of USDC need to verify though
    const contractUSDC = await ethers.getContractAt(abiUSDC, addressUSDC);
    console.log("USDC balance is ", await contractUSDC.balanceOf(addr1));
    console.log("Funding pool...3");

    // approve Zap contract to grab lvUSD and USDC from addr1
    await context.lvUSD.connect(signerAddr1).approve(addressZap, tenK18Decimal);
    await contractUSDC.connect(signerAddr1).approve(addressZap, tenK6Decimal);
    console.log("Funding pool...4 ");

    // const contractlvUSD3CRVPool = await ethers.getContractAt(abilvUSD3CRVPool, address3CRVlvUSDPool);

    // grab the "before" balances so we can check they increase after adding liquidity
    // const balancePoolLvUSD = await contractlvUSD3CRVPool.balances(0);
    // const balancePoolUSDC = await contractlvUSD3CRVPool.balances(1);
    console.log("Funding pool...4.1 ");

    // console.log("0 token balance on pool before fund", balancePoolLvUSD);
    // console.log("1 token balance on pool before fund", balancePoolUSDC);
    // Seed 3CRV/lvUSD pool via Zap
    const zap = await ethers.getContractAt(abiZap, addressZap);
    // Indexes: [lvUSD, DAI, USDC, USDT] - represent the amount of token added to pool
    // Below we seed pool with 100 lvUSD and 100 USDC (and 0 USDT + 0 DAI)

    console.log("Funding pool...5");
    console.log("attempting to fund pool at %s", address3CRVlvUSDPool);
    const coins = [ethers.utils.parseUnits("1000", 18), "0x0", ethers.utils.parseUnits("1000", 6), "0x0"];
    await zap.connect(signerAddr1).add_liquidity(address3CRVlvUSDPool, coins, 0);
    console.log("Funding pool...6");
    // console.log("0 token balance on pool", await context.curveLvUSDPool.balances(0));
    // console.log("1 token balance on pool", await context.curveLvUSDPool.balances(1));
}
async function fundLVUSD () {
    console.log("Funding lvUSD");
    const amount = "10000";

    // grab lvUSD token contract
    // const contractlvUSDToken = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

    // grab lvUSD admin address
    const signerlvUSDAdmin = await impersonateAccount(addresslvUSDAdmin);
    fundAccount(addresslvUSDAdmin, About4700ETH);

    // grab lvUSD minter address
    const signerlvUSDMinter = await impersonateAccount(addresslvUSDMinter);
    fundAccount(addresslvUSDMinter, About4700ETH);

    await context.lvUSD.connect(signerlvUSDAdmin).setMintDestination(context.coordinator.address);
    await context.lvUSD.connect(signerlvUSDMinter).mint(ethers.utils.parseUnits(amount, 18));

    console.log(truncateEthAddress(context.coordinator.address) + " funded with " + amount + " LVUSD");
}

const fundARCH = async () => {
    console.log("Funding Arch");
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

dotenv.config({ path: "secrets/alchemy.env" });

async function helperResetNetwork () {
    const alchemyUrl = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

    // Reset hardhat mainnet fork
    await network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: {
                    jsonRpcUrl: alchemyUrl,
                },
            },
        ],
    });
}

export async function buildContractTestContext (): Promise<ContractTestContext> {
    await helperResetNetwork();

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

    // context.lvUSD = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

    // context.archToken = await ethers.getContractAt(abiArchToken, addressArchToken);

    const archTokenfactory = await ethers.getContractFactory("ArchToken");
    context.archToken = await archTokenfactory.deploy(context.owner.address);

    const lvUSDfactory = await ethers.getContractFactory("LvUSDToken");
    context.lvUSD = await lvUSDfactory.deploy(context.owner.address);
    console.log("Just creating pool..");
    context.curveLvUSDPool = await createAndFundMetapool(context.owner, context);
    console.log("Done creating pool..");
    // context.curveLvUSDPool = await ethers.getContractAt(abilvUSD3CRVPool, address3CRVlvUSDPool);

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

    console.log("Getting user some OUSD");
    // Get User some OUSD for principle
    await helperSwapETHWithOUSD(context.owner, ethers.utils.parseUnits("1.0"));

    console.log("Setting up accesses");
    await context.coordinator.setExecutive(context.leverageEngine.address);
    await context.positionToken.setExecutive(context.leverageEngine.address);

    await context.exchanger.setExecutive(context.coordinator.address);
    await context.vault.setExecutive(context.coordinator.address);
    await context.cdp.setExecutive(context.coordinator.address);

    // console.log("setting minter dest on lvUSD");
    // console.log("Calling setMint as %s", context.owner.address);
    // await context.lvUSD.connect(context.owner).setMintDestination(context.coordinator.address);

    // console.log("Minting lvUSD to coordinator");

    // await context.lvUSD.connect(context.owner).mint(ethers.utils.parseUnits("100000"));

    return context;
}

async function verifyDeployment () {
    console.log("ParamStore value rebaseFeeRate = %s", await context.parameterStore.getRebaseFeeRate());
    console.log("lvUSD address is", await context.lvUSD.address);
    console.log("Arch address is", await context.archToken.address);
    console.log("LevEngine address is", await context.leverageEngine.address);
    console.log("PositionToken address is", await context.positionToken.address);
    console.log("(local) OUSD address is", await context.externalOUSD.address);
    console.log("--Exchanger address is", await context.exchanger.address);
    console.log("--Coordinator address is", await context.coordinator.address);
    console.log("--ParamStore address is", await context.parameterStore.address);
    console.log("--Vault address is", await context.vault.address);
    console.log("--CDP address is", await context.cdp.address);
    console.log("------ owner address is", await context.owner.address);
    console.log("------ curve pool address is", await context.curveLvUSDPool.address);
}
const deployScript = async () => {
    context = await buildContractTestContext();
    await fundLVUSD();
    await fundARCH();
    // await fundPool();
    await verifyDeployment();
    await cleanup();
};

deployScript();
