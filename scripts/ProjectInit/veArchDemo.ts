import { Contracts } from "./Contracts";
import { Signers } from "./Signers";

import hre, { ethers, network } from "hardhat";
import { veArchAbi } from "./veABI";
import { balPoolAbi } from "./balPoolAbi";
import { BigNumber } from "ethers";
import { parseEther, formatEther } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { CostExplorer } from "aws-sdk";


const veArchAddress = "0x286f0b0765176c5e31d6ec0c2a18627614b5f0b1";
const balancerPoolAddress = "0xdf2c03c12442c7a0895455a48569b889079ca52a";
const stakerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7"

async function main() {
    const signers = await new Signers().init();
    const contracts = await new Contracts(signers).init(signers);
    const balancerPool = await ethers.getContractAt(balPoolAbi, balancerPoolAddress, signers.owner);
    const veArch = await ethers.getContractAt(veArchAbi, veArchAddress, signers.owner);

    const stakerSigner = await ethers.getImpersonatedSigner(stakerAddress);
    const tx2 = await signers.owner.sendTransaction({
        to: stakerSigner.getAddress(),
        value: ethers.utils.parseEther("10.0"),
    });

    // set staker with Arch
    await contracts.archToken.connect(signers.treasury).transfer(stakerAddress, ethers.utils.parseEther("1000.0"));

    const userArchBalance = await contracts.archToken.balanceOf(stakerAddress)
    const veArchABalance = await veArch.balanceOf(stakerAddress)
    const balPoolLpBalance = await balancerPool.balanceOf(stakerAddress)
    const lpsToStake = balPoolLpBalance.div(2);
    console.log("-- balPoolLpBalance: ", formatEther(balPoolLpBalance));
    console.log("-- lpsToStake: ", formatEther(lpsToStake));

    // Begin flow

    // approve veArch to spend the staker balanceLP tokens
    await balancerPool.connect(stakerSigner).approve(veArchAddress, lpsToStake);

    // 1  - we check staker current lock. If exist, we execpt lock_end != 0.
    var lockEndTime = await veArch.locked__end(stakerAddress);

    if (lockEndTime.toNumber() != 0) {
        console.log("lock exist, need to extend or add to lock");
    } else {
        console.log("no lock exist, need to create lock");

        // calculate lock end date in epco  time in SECONDS  
        const lockEndDateToCommit = getEpocFromNowPlusDays(35); // div by 1000 to get seconds from miliseconds
        console.log("lockEndDateToCommit: ", lockEndDateToCommit);

        // create AND lock funds
        await veArch.connect(stakerSigner).create_lock(lpsToStake, lockEndDateToCommit);

        console.log("finished creating lock");

    }
    await printState(balancerPool, veArch, lpsToStake, stakerAddress);

    // Pass 15 days
    console.log("15 DAYS HAVE PASSED.....");
    await time.increase(60 * 60 * 24 * 15); // 15 days in seconds
    await printState(balancerPool, veArch, 0, stakerAddress);


    /// Add 15 days to lock
    console.log("ADD 15 DAYS TO LOCK, meaning restore it to 35 days");
    /// Need to add 15 since system time did not increae, only block chain time
    var lockEndDateToCommit = getEpocFromNowPlusDays(50);
    await veArch.connect(stakerSigner).increase_unlock_time(lockEndDateToCommit);
    await printState(balancerPool, veArch, 0, stakerAddress);

    // stake the rest of the LP tokens, under same lock
    console.log("STAKE THE REST OF THE LP TOKENS, UNDER SAME LOCK");
    await balancerPool.connect(stakerSigner).approve(veArchAddress, lpsToStake);
    await veArch.connect(stakerSigner).increase_amount(lpsToStake);
    await printState(balancerPool, veArch, lpsToStake.mul(2), stakerAddress);

}

async function printState(balancerPool, veArch, lpsToStake, stakerAddress) {
    var lockEndTime = await veArch.locked__end(stakerAddress);
    var lockedAmoumnt = await veArch.balanceOf(stakerAddress);
    console.log("chain time: ", new Date(await time.latest() * 1000));
    console.log("veLock end : ", new Date(lockEndTime.toNumber() * 1000)); // date expects epoc time in miliseconds
    console.log("deposited %s lpTokens and got %s veArch Balance", formatEther(lpsToStake), formatEther(lockedAmoumnt));
    console.log(" totalSupply %s", formatEther(await veArch.totalSupply()));
    console.log("%s LpTokens left to user at this time\n", formatEther(await balancerPool.balanceOf(stakerAddress)));
}

function getEpocFromNowPlusDays(days: number) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    return Math.floor(date.getTime() / 1000) // div by 1000 to get seconds from miliseconds
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
