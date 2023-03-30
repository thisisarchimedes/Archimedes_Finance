import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { formatEther, formatUnits } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import { helperSwapETHWithOUSD } from "../../../test/MainnetHelper";
import { Contracts } from "../Contracts";
import { DeploymentUtils } from "../DeploymentUtils";
import { ERC20Utils } from "../ERC20Utils";
import { EtherUtils } from "../EtherUtils";
import { AuctionInfo, LeverageHelper } from "../LeverageHelper";
import { Logger } from "../Logger";
import { NumberBundle } from "../NumberBundle";
import { Pools } from "../Pools";
import { PositionInfo } from "../PositionInfo";
import { PositionManager } from "../PositionManager";
import { Signers } from "../Signers";
import { ValueStore } from "../ValueStore";
import { deployOrGetAllContracts, verifyArcimedesEngine } from "./Helpers";

const shouldOpenPosition = false;
const shouldClosePosition = false;
const shouldFundUsers = true;
const shouldCreateAuction = true;
const shouldImportAccounts = true;
const shouldMintLvUSD = true;
const shouldUpgradeLeverageEngine = false;

const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6";
const gnosisOwnerAddress = "0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744";
const initOwnerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7";

const positionOwnerAddress = "0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50";

async function main() {
    const signers = await new Signers().init();

    /// END persistetn network
    let deployerOwner;
    let positionOwner;
    let gnosisOwner;
    let gnosisTreasury;
    if (shouldImportAccounts) {
        // ------  Impersonate users and fund ETH when persisting networ
        if (hre.network.name === "persistant") {
            console.log("impersonating account on persistant network");
            const provider = await new ethers.providers.JsonRpcProvider("http://ec2-54-211-119-50.compute-1.amazonaws.com:8545");
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [initOwnerAddress],
            });
            deployerOwner = await provider.getSigner(
                initOwnerAddress,
            );

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [gnosisOwnerAddress],
            });
            gnosisOwner = await provider.getSigner(
                gnosisOwnerAddress,
            );

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [treasuryAddress],
            });
            gnosisTreasury = await provider.getSigner(
                treasuryAddress,
            );
        } else {
            deployerOwner = await ethers.getImpersonatedSigner(initOwnerAddress);
            gnosisOwner = await ethers.getImpersonatedSigner(gnosisOwnerAddress);
            gnosisTreasury = await ethers.getImpersonatedSigner(treasuryAddress);
        }
        console.log("got  gnosis signer in address", await gnosisTreasury.getAddress());
        const tx = await signers.owner.sendTransaction({
            to: deployerOwner.getAddress(),
            value: ethers.utils.parseEther("3.0"),
        });
        const tx2 = await signers.owner.sendTransaction({
            to: gnosisOwner.getAddress(),
            value: ethers.utils.parseEther("3.0"),
        });
        const tx3 = await signers.owner.sendTransaction({
            to: await gnosisTreasury.getAddress(),
            value: ethers.utils.parseEther("2.0"),
        });
    } else {
        deployerOwner = signers.owner;
        // positionOwner = signers.treasury
        console.log("contract owner is ", await deployerOwner.getAddress());
        // console.log("position owner is ", await positionOwner.getAddress());
    }

    /// ----  Initialize contracts
    const contracts = new Contracts(signers);
    Logger.setVerbose(false);
    await deployOrGetAllContracts(contracts, false, false, false);
    const pools = await new Pools().init(contracts);
    Logger.setVerbose(false);

    /// ---------  Fund Users
    const SignersToFund: SignerWithAddress[] = await ethers.getSigners();
    if (shouldFundUsers) {
        /// starting with owner, funding a few users
        console.log("funding users");
        for (let i = 0; i < 10; i++) {
            // slow method, use only if needed
            // await helperSwapETHWithOUSD(SignersToFund[0], ethers.utils.parseUnits("0.4"));
            await pools.getUSDToUser(SignersToFund[i].address);
            await contracts.archToken.connect(gnosisTreasury).transfer(SignersToFund[i].address, ValueStore.TEN_ETH);
            console.log("funded user %s", await SignersToFund[i].getAddress());
        }
    }

    const positionManager = new PositionManager(contracts, pools);

    // -------  UNISWAP Info
    const path: string[] = [contracts.externalUSDC.address, contracts.archToken.address];
    const outArray = await pools.uniRouter.getAmountsIn(ValueStore.ONE_ETH, path);
    const uniswapPriceOfArch = NumberBundle.withBn(outArray[0], 6);
    console.log("uniswap price of arch is", uniswapPriceOfArch.getNum());

    // Change max leverage to 13x
    // await contracts.parameterStore.connect(deployerOwner).changeMaxNumberOfCycles(13)

    /// ------ Start auction section
    // await contracts.coordinator.connect(deployerOwner).resetAndBurnLeverage();

    // // Upgrade leverage engine
    if (shouldUpgradeLeverageEngine) {
        // const newLevEngineImp = await contracts.deployContract("LeverageEngine");
        // await contracts.leverageEngine.connect(gnosisOwner).upgradeTo(newLevEngineImp.address);
    }
    // await contracts.parameterStore.connect(deployerOwner).changePositionTimeToLiveInDays(31);

    if (shouldCreateAuction) {
        const leverageHelper = new LeverageHelper(contracts);
        const auction = new AuctionInfo(
            24000,
            NumberBundle.withNum(20000),
            NumberBundle.withNum(75000),
            NumberBundle.withNum(500000),
        );

        console.log("Trying to start auction with start/end price of %s/%s, %s blocks long ,for %s leverage",
            auction.startPrice.getNum(), auction.endPrice.getNum(), auction.length, auction.leverageAmount.getNum());
        console.log("Trying to start auction with start/end price of %s/%s, %s blocks long ,for %s leverage",
            auction.startPrice.getBn(), auction.endPrice.getBn(), auction.length, auction.leverageAmount.getNum());
        // Minting lvUSD and transfering to coordinator
        /// !!!!Remove this when dealing with mainnet - you have to do it manually!!!!
        if (shouldMintLvUSD) {
            console.log("Trying to mint lvUSD to coordinator. Remember if you're on mainnet, you MUST disable those lines!!");
            await contracts.lvUSD.connect(gnosisOwner).mint(auction.leverageAmount.getBn());
            console.log("Minted % lvUSD to coordinator", auction.leverageAmount.getNum());

            // await contracts.lvUSD.connect(gnosisTreasury).transfer(contracts.coordinator.address, auction.leverageAmount.getBn());
        }
        console.log("trying to start auction as %s", await deployerOwner.getAddress());
        await contracts.auction.connect(gnosisOwner).stopAuction();
        console.log("auction stopped");
        await leverageHelper.startAuctionAndAcceptLeverage(auction, gnosisOwner);
        console.log("auction created");

        // verify leverage on coordinator
        const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
        const coordinatorAvailableLvUSD = await leverageHelper.getLvUSDBalance(contracts.coordinator.address);
        console.log("accepted leverage is ", availableLeverage.getNum());
        console.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());
    }

    const currentBiddingPrice = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
    console.log("current bidding price is ", currentBiddingPrice.getNum());

    const shouldPositionViaLevEngine = false;
    if (shouldPositionViaLevEngine) {
        // const position = await PositionInfo.build(contracts, SignersToFund[0], NumberBundle.withNum(20), 5);
        // Logger.setVerbose(true);
        // // await positionManager.createPositionEndToEnd(position, true);
        // let availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
        // console.log("availableLeverage before creating position is ", availableLeverage.getNum());
        // await positionManager.createPositionEndToEnd(position, true);
        // availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
        // console.log("availableLeverage after creating position is ", availableLeverage.getNum());
        // await EtherUtils.mineBlock();
        // await positionManager.unwindPosition(position);
        // console.log("redeemed position for %s OUSD, which means earning of %s OUSD", position.ousdRedeemed.getNum(), position.ousdFinalEarning)

        // console.log("owner arch balance is", formatEther(await contracts.archToken.balanceOf(signers.owner.address)));
        // console.log("owner oUSD balance is", formatEther(await contracts.externalOUSD.balanceOf(signers.owner.address)));
        // console.log("owner arch allowance to levEngine is",
        //     formatEther(await contracts.archToken.allowance(signers.owner.address, contracts.leverageEngine.address)));
        // console.log("owner OUSD allowance to levEngine is",
        //     formatEther(await contracts.externalOUSD.allowance(signers.owner.address, contracts.leverageEngine.address)));
        // const availableLeverage = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
        // const coordinatorAvailableLvUSD = NumberBundle.withBn(await contracts.lvUSD.balanceOf(contracts.coordinator.address));
        // const isAuctionClosed = await contracts.auction.isAuctionClosed();
        // const currentBiddingPrice = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
        // console.log("current bidding price is ", currentBiddingPrice.getNum());
        // console.log("LvUSD balance of coooedinator is", coordinatorAvailableLvUSD.getNum());
        // console.log("isAuctionClosed", isAuctionClosed);
    }

    // // ------- Upgrade zapper (And others)
    // console.log("Deploying new zapper implementation");
    // const newZapperImp = await contracts.deployContract("Zapper");
    // await contracts.zapper.connect(deployerOwner).upgradeTo(newZapperImp.address);

    // // // ------- Upgrade LevEngine (And others)
    // console.log("Deploying new LevEngine implementation");
    // const newZapperImp = await contracts.deployContract("LeverageEngine");
    // await contracts.leverageEngine.connect(deployerOwner).upgradeTo(newZapperImp.address);
    // console.log("Done deploying new LevEngine implementation");

    const latestOpenPosition = 11;
    if (shouldOpenPosition) {
        const positionStack: PositionInfo[] = [];
        let ownerOfPosition: SignerWithAddress;
        for (let i = 0; i < 1; i++) {
            // ownerOfPosition = positionOwner
            ownerOfPosition = SignersToFund[i];
            console.log("owner of positon is %s", await ownerOfPosition.getAddress());
            console.log("\n----------Zapping in position %s------------", (i + 1));
            // ------- Zap in process
            const collataeral6dec = NumberBundle.withNum(1200 * (i + 1), 6);
            const numberOfCyclesForZapped = 12;
            const useUserArch = false;
            const maxSlippage = 990; // means 1% slippage

            const currentBiddingPriceBeforePreview = NumberBundle.withBn(await contracts.auction.getCurrentBiddingPrice());
            console.log("current bidding price before ZapPreview is ", currentBiddingPriceBeforePreview.getNum());
            const availableLeverageAfterZapIn = NumberBundle.withBn(await contracts.coordinator.getAvailableLeverage());
            console.log("availableLeverage before zapping in position is ", availableLeverageAfterZapIn.getNum());

            const previewResults = await contracts.zapper.connect(ownerOfPosition).previewZapInAmount(
                collataeral6dec.getBn(),
                numberOfCyclesForZapped,
                contracts.externalUSDT.address,
                useUserArch,
            );

            // EtherUtils.mineBlocks(10)
            // sleep for x seconds seconds to simulate some blocks
            // console.log("Going to sleep for 3 seconds");
            // // await sleep(3000);
            // console.log("Done sleeping");

            console.log("Preview zapping position with %s USDT, user user arch = ", collataeral6dec.getNum(), useUserArch);
            const archTokenAmountReturn = NumberBundle.withBn(previewResults.archTokenAmountReturn);
            console.log("archTokenAmountReturn ", archTokenAmountReturn.getNum());
            const ousdCollateralAmountReturn = NumberBundle.withBn(previewResults.ousdCollateralAmountReturn);

            console.log("ousdCollateralAmountReturn ", ousdCollateralAmountReturn.getNum());
            console.log("Now zapping using %s USDT", collataeral6dec.getNum());

            await contracts.externalUSDT.connect(ownerOfPosition).approve(contracts.zapper.address, collataeral6dec.getBn());
            console.log("Approved USDT");
            if (useUserArch) {
                await contracts.archToken.connect(ownerOfPosition).approve(contracts.zapper.address, archTokenAmountReturn.getBn());
                console.log("Approved arch");
            }

            console.log("ownerOfPositon USDT balance is", formatUnits(await contracts.externalUSDT.balanceOf(ownerOfPosition.address), 6));

            const treasuryOUSDBalanceBefore = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(treasuryAddress));
            const treasuryArchBalanceBefore = NumberBundle.withBn(await contracts.archToken.balanceOf(treasuryAddress));

            console.log("ZapIn Position params",
                collataeral6dec.getBn(),
                numberOfCyclesForZapped,
                archTokenAmountReturn.getBn(),
                ousdCollateralAmountReturn.getBn(),
                maxSlippage,
                contracts.externalUSDT.address,
                useUserArch);

            await contracts.zapper.connect(ownerOfPosition).zapIn(
                collataeral6dec.getBn(),
                numberOfCyclesForZapped,
                archTokenAmountReturn.getBn(),
                ousdCollateralAmountReturn.getBn(),
                maxSlippage,
                contracts.externalUSDT.address,
                useUserArch,
            );

            const treasuryOUSDBalanceAfter = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(treasuryAddress));
            const treasuryArchBalanceAfter = NumberBundle.withBn(await contracts.archToken.balanceOf(treasuryAddress));

            console.log("%s ousd deposited into treasury ", treasuryOUSDBalanceAfter.getNum() - treasuryOUSDBalanceBefore.getNum());
            console.log("%s ArchToken deposited into treasury ", treasuryArchBalanceAfter.getNum() - treasuryArchBalanceBefore.getNum());

            console.log("Done zapping in, now printing position info");
            const zappedPosition = await PositionInfo.build(contracts, ownerOfPosition, ousdCollateralAmountReturn, numberOfCyclesForZapped);
            positionStack.push(zappedPosition);

            /// This is super important -< need to choose the right one! (start  from 1 due to prevous positons)
            zappedPosition.positionTokenNum = i + latestOpenPosition;
            await zappedPosition.fillPositionPostCreation();
            Logger.setVerbose(true);
            await zappedPosition.printPositionInfo();
            console.log("----------END Zapping position %s END------------\n", (i + 1));
        }

        // for (let i = 0; i < 1; i++) {
        //     if (shouldClosePosition) {
        //         ownerOfPosition = SignersToFund[i];
        //         const zappedPosition = positionStack[i];

        //         // zappedPosition.positionOwner = ownerOfPosition;
        //         console.log("owner of zapped is", zappedPosition.positionOwner.address);
        //         // // ------- Zap out/unwind process
        //         console.log("----->Now unwinding zapped position %s-----", (i + 1));
        //         const ownerOUSDBalancBefore = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(ownerOfPosition.address));

        //         await positionManager.unwindPosition(zappedPosition);

        //         const ownerOUSDBalancAfter = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(ownerOfPosition.address));
        //         console.log("owner OUSD windfall from Zapped position is", ownerOUSDBalancAfter.getNum() - ownerOUSDBalancBefore.getNum());
        //     }
        // }
    }

    const estimateLastPositionId = 29;
    const block = 16671698;
    if (shouldClosePosition) {
        for (let i = 0; i < 22; i++) {
            const alchemyUrl = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;
            // Reset hardhat mainnet fork
            const blockToTest = block + 8000 * (i);
            await network.provider.request({
                method: "hardhat_reset",
                params: [
                    {
                        forking: {
                            jsonRpcUrl: alchemyUrl,
                            blockNumber: blockToTest,
                        },
                    }],
            });

            for (let index = 5; index < estimateLastPositionId; index++) {
                if (await contracts.positionToken.exists(index)) {
                    // console.log("now attmeping to get info on position %s", index)
                    const currentPositionOwnerAddress = await contracts.positionToken.ownerOf(index);
                    const ownerOfPosition = await ethers.getImpersonatedSigner(currentPositionOwnerAddress);

                    const tx = await signers.owner.sendTransaction({
                        to: ownerOfPosition.getAddress(),
                        value: ethers.utils.parseEther("12.0"),
                    });

                    const zappedPosition = await PositionInfo.build(contracts, ownerOfPosition, NumberBundle.withNum(1), 10);
                    zappedPosition.positionTokenNum = index;

                    const ownerOUSDBalancBefore = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(ownerOfPosition.address));
                    const userCollateral = NumberBundle.withBn(await contracts.cdp.getOUSDPrinciple(index));

                    await positionManager.unwindPosition(zappedPosition);

                    const ownerOUSDBalancAfter = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(ownerOfPosition.address));

                    console.log("%s, %s, %s, %s, %s",
                        blockToTest,
                        currentPositionOwnerAddress,
                        index,
                        userCollateral.getNum(),
                        ownerOUSDBalancAfter.getNum() - ownerOUSDBalancBefore.getNum());

                    // const positionNum = 4;
                    // const positionTotal = NumberBundle.withBn(await contracts.cdp.getOUSDPrinciple(positionNum));
                    // // console.log("position prince  is", positionTotal.getNum());
                    // const OUSDVaultBefore = NumberBundle.withBn(await contracts.vault.totalAssets());
                    // // console.log("OUSD Vault before closing position is", OUSDVaultBefore.getNum());
                    // const ownerOfPosition = await ethers.getImpersonatedSigner(positionOwnerAddress);
                    // const zappedPosition = await PositionInfo.build(contracts, ownerOfPosition, NumberBundle.withNum(1), 10);
                    // zappedPosition.positionTokenNum = positionNum;

                    // const tx = await signers.owner.sendTransaction({
                    //     to: ownerOfPosition.getAddress(),
                    //     value: ethers.utils.parseEther("1.0"),
                    // });
                    // const tx = await signers.owner.sendTransaction({
                    //     to: ownerOfPosition.getAddress(),
                    //     value: ethers.utils.parseEther("1.0"),
                    // });

                    // const zappedPosition = positionStack[i];
                    // zappedPosition.positionOwner = ownerOfPosition;
                    // console.log("owner of zapped is", zappedPosition.positionOwner.address);
                    // // ------- Zap out/unwind process
                    // console.log("----->Now unwinding zapped position %s-----", (i + 1));
                    // const ownerOUSDBalancBefore = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(ownerOfPosition.address));

                    // await positionManager.unwindPosition(zappedPosition);

                    // const ownerOUSDBalancAfter = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(ownerOfPosition.address));
                    // const OUSDVaultAfter = NumberBundle.withBn(await contracts.vault.totalAssets());

                    // console.log("$% windfall, vault withdraw was %s",
                    //     ownerOUSDBalancAfter.getNum() - ownerOUSDBalancBefore.getNum(), OUSDVaultBefore.getNum() - OUSDVaultAfter.getNum());
                    // console.log("OUSD Vault AFTER closing position is", OUSDVaultAfter.getNum());
                    // console.log("OUSD Vault lost is", OUSDVaultBefore.getNum() - OUSDVaultAfter.getNum());
                    // console.log("customer position total is", positionTotal.getNum());
                }
            }
        }
    }
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
