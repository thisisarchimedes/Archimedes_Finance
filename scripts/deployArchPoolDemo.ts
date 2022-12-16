import { ethers } from "hardhat";
import {
    buildContractTestContext,
    deployArchEthPool,
    getArchEthPoolReserves,
} from "../test/ContractTestContext";
import { createEthPairPool, getReserves } from "../test/uniswap/UniswapTools";

// Demo
async function usingUniswapTools () {
    const [ signer ] = await ethers.getSigners();

    // Deploy ArchToken Contract
    const ArchTokenCF = await ethers.getContractFactory("ArchToken");
    const ArchToken = await ArchTokenCF.deploy(signer.address);

    console.log("signer arch balance:", await ArchToken.balanceOf(signer.address));
    console.log("signer eth balance:", await ethers.provider.getBalance(signer.address));
    // Deploy Arch Eth Pair Liquidity Pool
    const [ ArchEthPool, ArchEthLPToken ] = await createEthPairPool(ArchToken, 1000, 5, signer);
    // Get totalSupply of newly created LP Token
    console.log("ArchEth LP Token Total Supply", await ArchEthLPToken.totalSupply());
    console.log("signer LP balance:", await ArchEthLPToken.balanceOf(signer.address));
    // Reserves
    console.log("Pool reserves", await getReserves(ArchEthPool));
}

usingUniswapTools().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

async function usingContractTestContext () {
    const context = await buildContractTestContext();

    const addr1 = context.addr1;
    console.log("arch balance:", await context.archToken.balanceOf(addr1.address));
    console.log("deployer eth balance:", await ethers.provider.getBalance(addr1.address));
    // Deploy Arch Eth Pair Liquidity Pool
    await deployArchEthPool(context, 100, 5);
    // Get totalSupply of newly created LP Token
    console.log("ArchEth LP Token Total Supply", await context.uniswapArchEthLPToken.totalSupply());
    // Liquidity provider should have entire LP token supply
    console.log("LP balance:", await context.uniswapArchEthLPToken.balanceOf(addr1.address));
    // Check the pool reserves
    console.log("Pool reserves:", await getArchEthPoolReserves(context));
}

usingContractTestContext().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
