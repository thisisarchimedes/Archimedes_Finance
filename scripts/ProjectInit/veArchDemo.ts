import { Contracts } from "./Contracts";
import { Signers } from "./Signers";

import hre, { ethers, network } from "hardhat";
import { veArchAbi } from "./veABI";
import { balPoolAbi } from "./balPoolAbi";
import { feeDisABI } from "./feeDisABI";

import { BigNumber } from "ethers";
import { parseEther, formatEther, formatUnits } from "ethers/lib/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { CostExplorer } from "aws-sdk";
import { balVaultABI } from "./balVaultABI";
import { abiUSDC } from "../../test/ABIs";


const veArchAddress = "0x286f0b0765176c5e31d6ec0c2a18627614b5f0b1";
const balancerPoolAddress = "0xdf2c03c12442c7a0895455a48569b889079ca52a";
const balancerVaultAddress = "0xba12222222228d8ba445958a75a0704d566bf2c8";
const stakerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7";

const feeDisAddress = "0xB12a775ac2811b32c26Dfde3101Fd2018105De36";

const usdtHolderAddress = "0xDD47B8411c2fe553fDDBE8E43099ab5C89B0bB25";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

async function main() {
    const signers = await new Signers().init();
    const contracts = await new Contracts(signers).init(signers);

    const balancerPool = await ethers.getContractAt(balPoolAbi, balancerPoolAddress, signers.owner);
    const veArch = await ethers.getContractAt(veArchAbi, veArchAddress, signers.owner);
    const feeDis = await ethers.getContractAt(feeDisABI, feeDisAddress, signers.owner);
    const balancerVault = await ethers.getContractAt(balVaultABI, balancerVaultAddress, signers.owner);
    const weth = await ethers.getContractAt(abiUSDC, wethAddress, signers.owner);

    const stakerSigner = await ethers.getImpersonatedSigner(stakerAddress);
    const usdtHolderSigner = await ethers.getImpersonatedSigner(usdtHolderAddress);
    await signers.owner.sendTransaction({
        to: stakerSigner.getAddress(),
        value: ethers.utils.parseEther("10.0"),
    });

    await signers.owner.sendTransaction({
        to: usdtHolderSigner.getAddress(),
        value: ethers.utils.parseEther("10.0"),
    });


    // set staker with Arch
    await contracts.archToken.connect(signers.treasury).transfer(stakerAddress, ethers.utils.parseEther("1000.0"));


    /// get LP tokens
    /* 
    Function: joinPool(bytes32, address, address, (address[],uint256[],bytes,bool))
#	Name	Type	Data
1	poolId	bytes32	0xdf2c03c12442c7a0895455a48569b889079ca52a000200000000000000000538
2	sender	address	0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7
3	recipient	address	0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7
3	request.assets	address	0x73C69d24ad28e2d43D03CBf35F79fE26EBDE1011,0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
3	request.maxAmountsIn	uint256[]	2776006185827750000,2475576973130421
3	request.userData	bytes	0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000012d23375e9efd5b3000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000026865aeb088cd0700000000000000000000000000000000000000000000000000008cb862e18fab5
3	request.fromInternalBalance	bool	false
// */
    //     console.log("--1: getting LP tokens");
    //     await contracts.archToken.connect(stakerSigner).approve(balancerPoolAddress, ethers.utils.parseEther("1000.0"));
    //     await weth.connect(stakerSigner).approve(balancerPoolAddress, ethers.utils.parseEther("0.002475576973130421"));
    //     await contracts.archToken.connect(stakerSigner).approve(balancerVaultAddress, ethers.utils.parseEther("1000.0"));
    //     await weth.connect(stakerSigner).approve(balancerVaultAddress, ethers.utils.parseEther("0.002475576973130421"));
    //     console.log("---- approved WETH and ARCH");
    //     await balancerVault.connect(stakerSigner).joinPool("0xdf2c03c12442c7a0895455a48569b889079ca52a000200000000000000000538", stakerAddress, stakerAddress,
    //         [
    //             [contracts.archToken.address, wethAddress],
    //             ["2776006185827750000", "2475576973130421"],
    //             "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000012d23375e9efd5b3000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000026865aeb088cd0700000000000000000000000000000000000000000000000000008cb862e18fab5",
    //             false
    //         ]);
    //     console.log("--2: getting LP tokens");

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



    console.log("\n###### Start playing around with fee #######\n")
    /// Now play with Fee distributor
    // deposit 55 USDC to fee distributor

    await time.increase(60 * 60 * 24 * 15); // 15 days in seconds
    console.log("waited 15 days since user last locked, now will deposit. Those funds will not be available right away");

    const amountToDeposit = ethers.utils.parseUnits("55.0", 6);
    await contracts.externalUSDT.connect(usdtHolderSigner).approve(feeDisAddress, amountToDeposit);
    await feeDis.connect(usdtHolderSigner).depositToken(contracts.externalUSDT.address, amountToDeposit);
    console.log("deposited USDC to feeDisAddress");

    await time.increase(60 * 60 * 24 * 5); // 5 days in seconds
    console.log("Wait 5 days after deposit and then attemping to claim");

    const currentTotalUSDTRewards = await feeDis.connect(stakerSigner).getTokenLastBalance(contracts.externalUSDT.address);
    console.log("got token last balance");
    console.log("Fee Distributer (getTokenLastBalance) has %s usdt rewards ", formatUnits(currentTotalUSDTRewards, 6));

    const currentBlocktimeStamp = await time.latest();
    const currentBlocktimeStampInMiliseconds = currentBlocktimeStamp * 1000;
    const weekInFutureTimeStamp = currentBlocktimeStampInMiliseconds + 6.048e+8; // 7 days in miliseconds


    console.log("currentBlocktimeStamp: %s, one week in the future %s", new Date(currentBlocktimeStampInMiliseconds).toLocaleDateString(), new Date(weekInFutureTimeStamp).toLocaleDateString());
    const tokenCurserTime = await feeDis.getTokenTimeCursor(contracts.externalUSDT.address)
    console.log("tokenCurserTime: %s", new Date(tokenCurserTime * 1000).toLocaleDateString());
    // const rewardsAtWeekInFuture = await feeDis.getTokensDistributedInWeek(contracts.externalUSDT.address, weekInFutureTimeStamp / 1000);
    // console.log("at %s rewards will be %s USDT",
    //     new Date(weekInFutureTimeStamp).toLocaleDateString(),
    //     formatUnits(rewardsAtWeekInFuture, 6));

    console.log("claiming rewards right this instant");
    const stakerUSDTBalanceBefore = await contracts.externalUSDT.balanceOf(stakerAddress);
    await feeDis.connect(stakerSigner).claimToken(stakerAddress, contracts.externalUSDT.address);
    const stakerUSDTBalanceAfter = await contracts.externalUSDT.balanceOf(stakerAddress);

    console.log("staker gained %s usdt rewards ", formatUnits(stakerUSDTBalanceAfter.sub(stakerUSDTBalanceBefore), 6));


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
