import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { Contract } from "@nomiclabs/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import { Signers } from "./Signers";
import { Contracts } from "./Contracts";
import { Pools } from "./Pools";
import { Logger } from "./Logger";

/// test class 
async function main() {
    Logger.setVerbose(true);
    const signers = await new Signers().init();
    const contracts = await new Contracts().init(signers);
    const pools = await new Pools().init(contracts);
    // await pools.exchangeEthForExactStable(ethers.utils.parseUnits("100.0", 18), signers.c1.address, contracts.externalDAI.address);
    // const c1USDT = await contracts.externalDAI.balanceOf(signers.c1.address);
    // console.log("3crv Balance: ", c1USDT);
    // const pool = await pools._createCurvePool("lvUSD3CRV", contracts.lvUSD.address);
    await pools.exchangeEthForExact3CRV(ethers.utils.parseUnits("100.0", 6), signers.owner.address);
    console.log("6");
    console.log("Pool Address: ", pools.curveLvUSDPool.address);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});