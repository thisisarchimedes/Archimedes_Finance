"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const MainnetHelper_1 = require("./MainnetHelper");
const ContractTestContext_1 = require("./ContractTestContext");
const utils_1 = require("ethers/lib/utils");
function getFloatFromBigNum(bigNumValue) {
    return parseFloat((0, utils_1.formatUnits)(bigNumValue));
}
async function setCoordinatorAsExcecutive(r) {
    await r.vault.setExecutive(r.coordinator.address);
    await r.exchanger.setExecutive(r.coordinator.address);
    await r.cdp.setExecutive(r.coordinator.address);
}
describe("Coordinator Test suit", function () {
    let r;
    let endUserSigner;
    let sharesOwnerAddress;
    let coordinator;
    const nftIdAddr1Position = 35472;
    const nftIdAddr2Position = 15426;
    before(async function () {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        await setCoordinatorAsExcecutive(r);
        endUserSigner = r.owner;
        // Object under test
        coordinator = r.coordinator;
        sharesOwnerAddress = coordinator.address;
        await hardhat_1.ethers.provider.send("evm_mine");
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(endUserSigner, hardhat_1.ethers.utils.parseUnits("5.0"));
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.addr2, hardhat_1.ethers.utils.parseUnits("5.0"));
        await hardhat_1.ethers.provider.send("evm_mine");
    });
    describe("Deposit collateral into new NFT position", function () {
        /// depositing collateral is expected to transfer funds to vault
        // shares to be minted and create a new CDP entry with valid values
        const addr1CollateralAmount = hardhat_1.ethers.utils.parseUnits("1");
        const addr2CollateralAmount = hardhat_1.ethers.utils.parseUnits("2");
        const combinedCollateralAmount = addr1CollateralAmount.add(addr2CollateralAmount);
        /* Shares and assets always increase by the same amount in our vault (both are equal) because
           only one user (coordinator) is depositing. Each time a deposit takes place the shares for the
           deposit are stored in CDPosition. Therefore the amount of shares is equal to the collateral: */
        before(async function () {
            // transfer OUSD from user to coordinator address
            // (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, addr1CollateralAmount);
            (0, chai_1.expect)(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr1CollateralAmount);
            await coordinator.depositCollateralUnderNFT(nftIdAddr1Position, addr1CollateralAmount, {
                gasLimit: 3000000,
            });
        });
        it("Should have transferred collateral out of coordinator address", async function () {
            (0, chai_1.expect)(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(0);
        });
        it("Should have increased vault balance on OUSD", async function () {
            const balance = await r.externalOUSD.balanceOf(r.vault.address);
            (0, chai_1.expect)(balance).to.equal(addr1CollateralAmount);
        });
        it("Should have increased OUSD in the vault", async function () {
            (0, chai_1.expect)(await r.vault.totalAssets()).to.equal(addr1CollateralAmount);
        });
        it("Should have increased OUSD shares", async function () {
            (0, chai_1.expect)(await r.vault.totalSupply()).to.equal(addr1CollateralAmount);
        });
        it("Should have given shares to shares owner", async function () {
            (0, chai_1.expect)(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(addr1CollateralAmount);
        });
        it("Should create entry for first depositer principle in CDP", async function () {
            (0, chai_1.expect)(await r.cdp.getOUSDPrinciple(nftIdAddr1Position)).to.equal(addr1CollateralAmount);
        });
        it("Should create entry for first depositer shares in CDP", async function () {
            (0, chai_1.expect)(await r.cdp.getShares(nftIdAddr1Position)).to.equal(addr1CollateralAmount);
        });
        describe("Withdraw collateral From NFT", async function () {
            /// TODO: Add tests, waiting for next PR as I need to add fees to method
        });
        describe("Separate deposits made by another user", function () {
            before(async function () {
                // transfer OUSD from user to coordinator address
                // (this will happen in leverage engine in full Archimedes flow)
                await r.externalOUSD.connect(r.addr2).transfer(coordinator.address, addr2CollateralAmount);
                (0, chai_1.expect)(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr2CollateralAmount);
                await coordinator.depositCollateralUnderNFT(nftIdAddr2Position, addr2CollateralAmount, { gasLimit: 3000000 });
            });
            it("Should have increased vault balance on OUSD by second collateral amount", async function () {
                const balance = await r.externalOUSD.balanceOf(r.vault.address);
                (0, chai_1.expect)(balance).to.equal(combinedCollateralAmount);
            });
            it("Should have increased OUSD in the vault by second collateral amount", async function () {
                (0, chai_1.expect)(await r.vault.totalAssets()).to.equal(combinedCollateralAmount);
            });
            it("Should have increased OUSD shares by second collateral amount", async function () {
                (0, chai_1.expect)(await r.vault.totalSupply()).to.equal(combinedCollateralAmount);
            });
            it("Should have increased shares to shares owner by second collateral amount", async function () {
                (0, chai_1.expect)(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(combinedCollateralAmount);
            });
            it("Should create entry for second depositer principle in CDP", async function () {
                (0, chai_1.expect)(await r.cdp.getOUSDPrinciple(nftIdAddr2Position)).to.equal(addr2CollateralAmount);
            });
            it("Should create entry for second depositer shares in CDP", async function () {
                (0, chai_1.expect)(await r.cdp.getShares(nftIdAddr2Position)).to.equal(addr2CollateralAmount);
            });
            it("Vault should contain the correct number of shares and assets after a rebase event", async function () {
                const rebaseAmount = hardhat_1.ethers.utils.parseUnits("1");
                /* simulate rebase by transferring from random new address: */
                await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.addr3, rebaseAmount);
                await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, rebaseAmount);
                /* shares should stay the same since no address called deposit into the vault: */
                const totalShares = await r.vault.totalSupply();
                (0, chai_1.expect)(totalShares).to.equal(combinedCollateralAmount);
                /* assets should increase due to rebase simulation: */
                const totalAssets = await r.vault.totalAssets();
                (0, chai_1.expect)(totalAssets).to.equal(combinedCollateralAmount.add(rebaseAmount));
            });
        });
        describe("Borrow lvUSD for position", function () {
            const lvUSDAmountToBorrow = hardhat_1.ethers.utils.parseUnits("2");
            const nftIdFirstPosition = 35472;
            before(async function () {
                // mint lvUSD to be borrowed, assign all minted lvUSD to coordinator as it will spend it
                await r.lvUSD.setMintDestination(r.coordinator.address);
                await r.lvUSD.mint(hardhat_1.ethers.utils.parseUnits("100"));
                await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(r, hardhat_1.ethers.utils.parseUnits("100"));
                // method under test
                await coordinator.borrowUnderNFT(nftIdFirstPosition, lvUSDAmountToBorrow);
            });
            it("Should transfer lvUSD to exchanger address", async function () {
                /// general note - "borrowed" lvUSD is assigned to exchanger
                (0, chai_1.expect)(await r.lvUSD.balanceOf(r.exchanger.address)).to.equal(lvUSDAmountToBorrow);
            });
            it("Should decrease coordinator lvUSD balance", async function () {
                /// we expect coordinator to have 98 ethers since we started with 100 ether lvUSD and borrowed 2 ethers
                (0, chai_1.expect)(await r.lvUSD.balanceOf(coordinator.address)).to.equal(hardhat_1.ethers.utils.parseUnits("98"));
            });
            it("Should update CDP with borrowed lvUSD", async function () {
                (0, chai_1.expect)(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(lvUSDAmountToBorrow);
            });
            it("Should fail to borrow if trying to borrow more lvUSD token then are under coordinator address", async function () {
                await (0, chai_1.expect)(coordinator.borrowUnderNFT(nftIdFirstPosition, hardhat_1.ethers.utils.parseUnits("200"))).to.be.revertedWith("insuf levAv to trnsf");
            });
            describe("Repay lvUSD for position", function () {
                const lvUSDAmountToRepayInTwoParts = hardhat_1.ethers.utils.parseUnits("1");
                before(async function () {
                    // method under test
                    await coordinator.repayUnderNFT(nftIdFirstPosition, lvUSDAmountToRepayInTwoParts);
                });
                it("Should update CDP with repayed lvUSD", async function () {
                    (0, chai_1.expect)(getFloatFromBigNum(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition))).to.closeTo(getFloatFromBigNum(lvUSDAmountToRepayInTwoParts), 0.2);
                });
            });
            let depositedOUSDBeforeLeverage;
            describe("Get leveraged OUSD for position", function () {
                const leverageAmount = addr1CollateralAmount;
                let sharesTotalSupplyBeforeLeverage;
                let borrowedLvUSDInPositionBeforeLeverage;
                let originationFee;
                before(async function () {
                    /// Get initial state
                    borrowedLvUSDInPositionBeforeLeverage = await r.cdp.getLvUSDBorrowed(nftIdFirstPosition);
                    // logger("borrowedLvUSDInPositionBeforeLeverage", borrowedLvUSDInPositionBeforeLeverage);
                    /// Test artifact only, Once exchanger is functional we can use the exchange and
                    /// transfer OUSD directly to coordinator
                    await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, leverageAmount);
                    // method under test
                    depositedOUSDBeforeLeverage = await r.vault.totalAssets();
                    originationFee = await r.parameterStore.calculateOriginationFee(leverageAmount);
                    sharesTotalSupplyBeforeLeverage = await r.vault.maxRedeem(sharesOwnerAddress);
                    // we need more lvusd for exchanger
                    await r.lvUSD.setMintDestination(coordinator.address);
                    await r.lvUSD.mint(hardhat_1.ethers.utils.parseUnits("100"));
                    await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(r, hardhat_1.ethers.utils.parseUnits("100"));
                    await coordinator.getLeveragedOUSD(nftIdFirstPosition, leverageAmount);
                });
                it("Should have increase borrowed amount on CDP for NFT", async function () {
                    (0, chai_1.expect)(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(borrowedLvUSDInPositionBeforeLeverage.add(leverageAmount));
                });
                it("Should have increased OUSD deposited in vault", async function () {
                    const expectedTotalAssets = getFloatFromBigNum(leverageAmount.add(depositedOUSDBeforeLeverage).sub(originationFee));
                    // expect(await r.vault.totalAssets()).to.equal(leverageAmount.add(depositedOUSDBeforeLeverage).sub(originationFee));
                    (0, chai_1.expect)(getFloatFromBigNum(await r.vault.totalAssets())).to.closeTo(expectedTotalAssets, 10);
                });
                it("Should have minted (more) shares to owner address", async function () {
                    (0, chai_1.expect)(await r.vault.maxRedeem(sharesOwnerAddress)).to.gt(sharesTotalSupplyBeforeLeverage);
                });
                it("Should have increased deposited (or totalOUSD) OUSD in CDPosition", async function () {
                    const existingOUSDBeforeLeverage = addr1CollateralAmount;
                    const expectedOUSDTotal = getFloatFromBigNum(leverageAmount.add(existingOUSDBeforeLeverage).sub(originationFee));
                    (0, chai_1.expect)(getFloatFromBigNum(await r.cdp.getOUSDTotalWithoutInterest(nftIdFirstPosition))).to.closeTo(expectedOUSDTotal, 10);
                });
                it("Should have update CDPosition with shares", async function () {
                    // When getting leveraged OUSD and depositing it into Vault, shares are not always one to one
                    // (based on a math calculation in Vault). The value below is what we expect to
                    // get at this state of the vault
                    const numberOfSharesFromLeverage = hardhat_1.ethers.BigNumber.from("712500000000000000");
                    const expectedShares = getFloatFromBigNum(numberOfSharesFromLeverage.add(addr1CollateralAmount));
                    (0, chai_1.expect)(getFloatFromBigNum(await r.cdp.getShares(nftIdFirstPosition))).to.closeTo(expectedShares, 10);
                });
                // Commenting out till exchanger is done as unwind would not work yet
                describe("Unwind leveraged position", function () {
                    let vaultOUSDAmountBeforeUnwind;
                    let positionShares;
                    let positionTotalOUSD;
                    let positionExpectedOUSDTotalPlusInterest;
                    let positionInterestEarned;
                    let userExistingOUSDValueBeforeUnwind;
                    let coordinatorLvUSDBalanceBefore;
                    let exchangerLvUSDBalanceBefore;
                    before(async function () {
                        await hardhat_1.ethers.provider.send("evm_mine");
                        vaultOUSDAmountBeforeUnwind = await r.vault.totalAssets();
                        positionTotalOUSD = await r.cdp.getOUSDTotalWithoutInterest(nftIdFirstPosition);
                        positionShares = await r.cdp.getShares(nftIdFirstPosition);
                        positionExpectedOUSDTotalPlusInterest = await r.vault.convertToAssets(positionShares);
                        positionInterestEarned = positionExpectedOUSDTotalPlusInterest.sub(positionTotalOUSD);
                        userExistingOUSDValueBeforeUnwind = await r.externalOUSD.balanceOf(endUserSigner.address);
                        coordinatorLvUSDBalanceBefore = await r.lvUSD.balanceOf(r.coordinator.address);
                        exchangerLvUSDBalanceBefore = await r.lvUSD.balanceOf(r.exchanger.address);
                        console.log("coordinatorLvUSDBalanceBefore", getFloatFromBigNum(coordinatorLvUSDBalanceBefore));
                        console.log("exchangerLvUSDBalanceBefore", getFloatFromBigNum(exchangerLvUSDBalanceBefore));
                        await coordinator.unwindLeveragedOUSD(nftIdFirstPosition, endUserSigner.address);
                    });
                    it("Should burn lvUSD and not transfer to coordinator on unwind", async function () {
                        const coordinatorLvUSDBalanceAfter = await r.lvUSD.balanceOf(r.coordinator.address);
                        await hardhat_1.ethers.provider.send("evm_mine");
                        await (0, chai_1.expect)(coordinatorLvUSDBalanceAfter).to.be.eq(coordinatorLvUSDBalanceBefore);
                    });
                    it("Should burn lvUSD and not hold on exchanger on unwind", async function () {
                        const exchangerLvUSDBalanceAfter = await r.lvUSD.balanceOf(r.exchanger.address);
                        await hardhat_1.ethers.provider.send("evm_mine");
                        await (0, chai_1.expect)(exchangerLvUSDBalanceAfter).to.be.eq(exchangerLvUSDBalanceBefore);
                    });
                    it(`Should reduce assets in Vault by the entire OUSD amount of
                        position (principle, leveraged and interest)`, async function () {
                        (0, chai_1.expect)(await r.vault.totalAssets()).to.be.closeTo(vaultOUSDAmountBeforeUnwind.sub(positionExpectedOUSDTotalPlusInterest), 1);
                    });
                    it("Should transfer principle plus interest to user", async function () {
                        const userExpectedOUSDBalance = parseFloat(hardhat_1.ethers.utils.formatEther(addr1CollateralAmount.add(positionInterestEarned).add(userExistingOUSDValueBeforeUnwind).sub(originationFee)));
                        const userActualOUSDBalance = parseFloat(hardhat_1.ethers.utils.formatEther(await r.externalOUSD.balanceOf(endUserSigner.address)));
                        (0, chai_1.expect)(userActualOUSDBalance).to.be.closeTo(userExpectedOUSDBalance, 1.5);
                    });
                    it("Should have deleted CDP position", async function () {
                        /// a view method does not revert but just throw an exception.
                        try {
                            await r.cdp.getOUSDPrinciple(nftIdFirstPosition);
                            chai_1.assert.fail("Error - Getting CDP OUSD Principle on a deleted position must throw exception");
                        }
                        catch (e) { }
                    });
                    // TODO : Once exchanger is up, need to check that lvUSD was returned to coordinator address
                });
            });
        });
    });
    // Comment out till exchanger is done as unwind will not work well. Might be able to remove once we have integration tests
    describe("Coordinator overview testing", function () {
        const endToEndTestNFTId = 34674675;
        const collateralAmount = hardhat_1.ethers.utils.parseUnits("50");
        const mintedLvUSDAmount = hardhat_1.ethers.utils.parseUnits("100000");
        let leverageToGetForPosition;
        let originationFeeAmount;
        let depositedLeveragedOUSD;
        before(async function () {
            r = await (0, ContractTestContext_1.buildContractTestContext)();
            await setCoordinatorAsExcecutive(r);
            endUserSigner = r.owner;
            sharesOwnerAddress = r.coordinator.address;
            const tempFakeExchangerAddr = r.addr2;
            await (0, MainnetHelper_1.helperSwapETHWithOUSD)(endUserSigner, hardhat_1.ethers.utils.parseUnits("8.0"));
            await (0, MainnetHelper_1.helperSwapETHWithOUSD)(tempFakeExchangerAddr, hardhat_1.ethers.utils.parseUnits("8.0"));
            // Get some helpful values for tests
            leverageToGetForPosition = await r.parameterStore.getAllowedLeverageForPosition(collateralAmount, 5);
            originationFeeAmount = await r.parameterStore.calculateOriginationFee(leverageToGetForPosition);
            depositedLeveragedOUSD = leverageToGetForPosition.sub(originationFeeAmount);
            /// setup test environment
            /// 1. Transfer OUSD principle from user to coordinator address (simulate leverage engine task when creating position)
            /// 3. Mint enough lvUSD under coordinator address to get leveraged OUSD (via lvUSD borrowing)
            await r.externalOUSD.connect(endUserSigner).transfer(r.coordinator.address, collateralAmount);
            await r.lvUSD.setMintDestination(r.coordinator.address);
            await r.lvUSD.mint(mintedLvUSDAmount);
            await (0, ContractTestContext_1.startAuctionAcceptLeverageAndEndAuction)(r, mintedLvUSDAmount);
            /// Complete create position cycle from coordinator perspective
            await r.externalOUSD.approve(r.coordinator.address, collateralAmount);
            await r.coordinator.depositCollateralUnderNFT(endToEndTestNFTId, collateralAmount);
            /// Doing 5 cycles for this position
            await r.coordinator.getLeveragedOUSD(endToEndTestNFTId, leverageToGetForPosition);
        });
        it("Should have updated CDP getOUSDPrinciple with values for leveraged position", async function () {
            (0, chai_1.expect)(await r.cdp.getOUSDPrinciple(endToEndTestNFTId)).to.equal(collateralAmount);
        });
        it("Should have updated CDP getOUSDInterestEarned with values for leveraged position", async function () {
            (0, chai_1.expect)(await r.cdp.getOUSDInterestEarned(endToEndTestNFTId)).to.equal(0);
        });
        it("Should have updated CDP getOUSDTotal with values for leveraged position", async function () {
            (0, chai_1.expect)(getFloatFromBigNum(await r.cdp.getOUSDTotalWithoutInterest(endToEndTestNFTId))).to.closeTo(getFloatFromBigNum(collateralAmount.add(depositedLeveragedOUSD)), 10);
        });
        it("Should have updated CDP getLvUSDBorrowed with values for leveraged position", async function () {
            (0, chai_1.expect)(await r.cdp.getLvUSDBorrowed(endToEndTestNFTId)).to.equal(leverageToGetForPosition);
        });
        it("Should have updated CDP getShares with values for leveraged position", async function () {
            (0, chai_1.expect)(getFloatFromBigNum(await r.cdp.getShares(endToEndTestNFTId))).to.closeTo(getFloatFromBigNum(collateralAmount.add(depositedLeveragedOUSD)), 10);
        });
        it("Should have emptied coordinator OUSD reserves (they need to go to Vault)", async function () {
            (0, chai_1.expect)(getFloatFromBigNum(await r.externalOUSD.balanceOf(r.coordinator.address))).to.closeTo(0, 10);
        });
        it("Should have deposited principle plus leveraged OUSD into Vault minus origination fees", async function () {
            (0, chai_1.expect)(getFloatFromBigNum(await r.vault.totalAssets())).to.closeTo(getFloatFromBigNum(collateralAmount.add(depositedLeveragedOUSD)), 10);
        });
        it("Should have transferred lvUSD out of coordinator minted amount", async function () {
            (0, chai_1.expect)(await r.lvUSD.balanceOf(r.coordinator.address)).to.equal(mintedLvUSDAmount.sub(leverageToGetForPosition));
        });
    });
});
