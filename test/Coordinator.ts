
import { assert, expect } from "chai";
import { ethers } from "hardhat";
import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import type { Coordinator } from "../types/contracts";
import { parseUnits, formatUnits } from "ethers/lib/utils";

function getFloatFromBigNum (bigNumValue) {
    return parseFloat(formatUnits(bigNumValue));
}

describe("Coordinator Test suit", function () {
    let r: ContractTestContext;
    let endUserSigner;
    let sharesOwnerAddress: string;
    let coordinator: Coordinator;
    const nftIdAddr1Position = 35472;
    const nftIdAddr2Position = 15426;

    before(async function () {
        await helperResetNetwork(defaultBlockNumber);

        r = await buildContractTestContext();

        endUserSigner = r.owner;
        // Object under test
        coordinator = r.coordinator;
        sharesOwnerAddress = coordinator.address;

        await helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseUnits("5.0"));
        await helperSwapETHWithOUSD(r.addr2, ethers.utils.parseUnits("5.0"));
    });

    describe("Deposit collateral into new NFT position", function () {
        /// depositing collateral is expected to transfer funds to vault
        // shares to be minted and create a new CDP entry with valid values
        const addr1CollateralAmount = ethers.utils.parseUnits("1");
        const addr2CollateralAmount = ethers.utils.parseUnits("2");
        const combinedCollateralAmount = addr1CollateralAmount.add(addr2CollateralAmount);
        /* Shares and assets always increase by the same amount in our vault (both are equal) because
           only one user (coordinator) is depositing. Each time a deposit takes place the shares for the
           deposit are stored in CDPosition. Therefore the amount of shares is equal to the collateral: */
        before(async function () {
            // transfer OUSD from user to coordinator address
            // (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, addr1CollateralAmount);
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr1CollateralAmount);
            await coordinator.depositCollateralUnderNFT(nftIdAddr1Position, addr1CollateralAmount, {
                gasLimit: 3000000,
            });
        });

        it("Should have transferred collateral out of coordinator address", async function () {
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(0);
        });
        it("Should have increased vault balance on OUSD", async function () {
            const balance = await r.externalOUSD.balanceOf(r.vault.address);
            expect(balance).to.equal(addr1CollateralAmount);
        });
        it("Should have increased OUSD in the vault", async function () {
            expect(await r.vault.totalAssets()).to.equal(addr1CollateralAmount);
        });
        it("Should have increased OUSD shares", async function () {
            expect(await r.vault.totalSupply()).to.equal(addr1CollateralAmount);
        });
        it("Should have given shares to shares owner", async function () {
            expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(addr1CollateralAmount);
        });
        it("Should create entry for first depositer principle in CDP", async function () {
            expect(await r.cdp.getOUSDPrinciple(nftIdAddr1Position)).to.equal(addr1CollateralAmount);
        });
        it("Should create entry for first depositer shares in CDP", async function () {
            expect(await r.cdp.getShares(nftIdAddr1Position)).to.equal(addr1CollateralAmount);
        });

        describe("Withdraw collateral From NFT", async function () {
            /// TODO: Add tests, waiting for next PR as I need to add fees to method
        });

        describe("Separate deposits made by another user", function () {
            before(async function () {
                // transfer OUSD from user to coordinator address
                // (this will happen in leverage engine in full Archimedes flow)
                await r.externalOUSD.connect(r.addr2).transfer(coordinator.address, addr2CollateralAmount);
                expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr2CollateralAmount);

                await coordinator.depositCollateralUnderNFT(
                    nftIdAddr2Position, addr2CollateralAmount, { gasLimit: 3000000 },
                );
            });

            it("Should have increased vault balance on OUSD by second collateral amount", async function () {
                const balance = await r.externalOUSD.balanceOf(r.vault.address);
                expect(balance).to.equal(combinedCollateralAmount);
            });
            it("Should have increased OUSD in the vault by second collateral amount", async function () {
                expect(await r.vault.totalAssets()).to.equal(combinedCollateralAmount);
            });
            it("Should have increased OUSD shares by second collateral amount", async function () {
                expect(await r.vault.totalSupply()).to.equal(combinedCollateralAmount);
            });
            it("Should have increased shares to shares owner by second collateral amount", async function () {
                expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(combinedCollateralAmount);
            });
            it("Should create entry for second depositer principle in CDP", async function () {
                expect(await r.cdp.getOUSDPrinciple(nftIdAddr2Position)).to.equal(addr2CollateralAmount);
            });
            it("Should create entry for second depositer shares in CDP", async function () {
                expect(await r.cdp.getShares(nftIdAddr2Position)).to.equal(addr2CollateralAmount);
            });
            it("Vault should contain the correct number of shares and assets after a rebase event", async function () {
                const rebaseAmount = ethers.utils.parseUnits("1");
                /* simulate rebase by transferring from random new address: */
                await helperSwapETHWithOUSD(r.addr3, rebaseAmount);
                await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, rebaseAmount);
                /* shares should stay the same since no address called deposit into the vault: */
                const totalShares = await r.vault.totalSupply();
                expect(totalShares).to.equal(combinedCollateralAmount);
                /* assets should increase due to rebase simulation: */
                const totalAssets = await r.vault.totalAssets();
                expect(totalAssets).to.equal(combinedCollateralAmount.add(rebaseAmount));
            });
        });

        describe("Borrow lvUSD for position", function () {
            const lvUSDAmountToBorrow = ethers.utils.parseUnits("2");
            const nftIdFirstPosition = 35472;

            before(async function () {
                // mint lvUSD to be borrowed, assign all minted lvUSD to coordinator as it will spend it
                await r.lvUSD.mint(coordinator.address, ethers.utils.parseUnits("100"));
                // method under test
                await coordinator.borrowUnderNFT(nftIdFirstPosition, lvUSDAmountToBorrow);
            });
            it("Should transfer lvUSD to exchanger address", async function () {
                /// general note - "borrowed" lvUSD is assigned to exchanger
                expect(await r.lvUSD.balanceOf(r.exchanger.address)).to.equal(lvUSDAmountToBorrow);
            });
            it("Should decrease coordinator lvUSD balance", async function () {
                /// we expect coordinator to have 98 ethers since we started with 100 ether lvUSD and borrowed 2 ethers
                expect(await r.lvUSD.balanceOf(coordinator.address)).to.equal(ethers.utils.parseUnits("98"));
            });
            it("Should update CDP with borrowed lvUSD", async function () {
                expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(lvUSDAmountToBorrow);
            });
            it("Should fail to borrow if trying to borrow more lvUSD token then are under coordinator address",
                async function () {
                    await expect(
                        coordinator.borrowUnderNFT(nftIdFirstPosition, ethers.utils.parseUnits("200")),
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });

            describe("Repay lvUSD for position", function () {
                const lvUSDAmountToRepayInTwoParts = ethers.utils.parseUnits("1");
                before(async function () {
                    // method under test
                    await coordinator.repayUnderNFT(nftIdFirstPosition, lvUSDAmountToRepayInTwoParts);
                });
                // it("Should transfer lvUSD to coordinator address", async function () {
                //     /// we expect coordinator to have 99 ethers since we started with 98 ether lvUSD and repayed 1
                //     expect(getFloatFromBigNum(await r.lvUSD.balanceOf(coordinator.address)))
                //         .to.closeTo(getFloatFromBigNum(ethers.utils.parseUnits("99")), 0.2);
                // });
                // it("Should decrease Vault's lvUSD balance", async function () {
                //     // Exchanger should still have half the lvUSD under it
                //     expect(await r.lvUSD.balanceOf(r.exchanger.address)).to.equal(lvUSDAmountToRepayInTwoParts);
                //     expect(getFloatFromBigNum(await r.lvUSD.balanceOf(r.exchanger.address)))
                //         .to.closeTo(getFloatFromBigNum(lvUSDAmountToRepayInTwoParts), 0.2);
                // });
                it("Should update CDP with repayed lvUSD", async function () {
                    expect(getFloatFromBigNum(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)))
                        .to.closeTo(getFloatFromBigNum(lvUSDAmountToRepayInTwoParts), 0.2);
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
                    console.log("borrowedLvUSDInPositionBeforeLeverage", borrowedLvUSDInPositionBeforeLeverage);
                    /// Test artifact only, Once exchanger is functional we can use the exchange and
                    /// transfer OUSD directly to coordinator
                    await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, leverageAmount);
                    // method under test
                    depositedOUSDBeforeLeverage = await r.vault.totalAssets();
                    originationFee = await r.parameterStore.calculateOriginationFee(leverageAmount);
                    sharesTotalSupplyBeforeLeverage = await r.vault.maxRedeem(sharesOwnerAddress);
                    // we need more lvusd for exchanger
                    await r.lvUSD.mint(coordinator.address, ethers.utils.parseEther("100"));
                    await coordinator.getLeveragedOUSD(nftIdFirstPosition, leverageAmount);
                });
                it("Should have increase borrowed amount on CDP for NFT", async function () {
                    expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(
                        borrowedLvUSDInPositionBeforeLeverage.add(leverageAmount));
                });
                it("Should have increased OUSD deposited in vault", async function () {
                    const expectedTotalAssets = getFloatFromBigNum(leverageAmount.add(depositedOUSDBeforeLeverage).sub(originationFee));
                    // expect(await r.vault.totalAssets()).to.equal(leverageAmount.add(depositedOUSDBeforeLeverage).sub(originationFee));
                    expect(getFloatFromBigNum(await r.vault.totalAssets())).to.closeTo(expectedTotalAssets, 10);
                });
                it("Should have minted (more) shares to owner address", async function () {
                    expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.gt(
                        sharesTotalSupplyBeforeLeverage);
                });
                it("Should have increased deposited (or totalOUSD) OUSD in CDPosition", async function () {
                    const existingOUSDBeforeLeverage = addr1CollateralAmount;
                    const expectedOUSDTotal = getFloatFromBigNum(leverageAmount.add(existingOUSDBeforeLeverage).sub(originationFee));
                    expect(getFloatFromBigNum(await r.cdp.getOUSDTotal(nftIdFirstPosition)))
                        .to.closeTo(expectedOUSDTotal, 10);
                });
                it("Should have update CDPosition with shares", async function () {
                    // When getting leveraged OUSD and depositing it into Vault, shares are not always one to one
                    // (based on a math calculation in Vault). The value below is what we expect to
                    // get at this state of the vault
                    const numberOfSharesFromLeverage = ethers.BigNumber.from("712500000000000000");
                    const expectedShares = getFloatFromBigNum(numberOfSharesFromLeverage.add(addr1CollateralAmount));

                    expect(getFloatFromBigNum(await r.cdp.getShares(nftIdFirstPosition)))
                        .to.closeTo(expectedShares, 10);
                });
                // Commenting out till exchanger is done as unwind would not work yet

                describe("Unwind leveraged position", function () {
                    let vaultOUSDAmountBeforeUnwind;
                    let positionShares;
                    let positionTotalOUSD;
                    let positionExpectedOUSDTotalPlusInterest;
                    let positionInterestEarned;

                    let userExistingOUSDValueBeforeUnwind;
                    before(async function () {
                        vaultOUSDAmountBeforeUnwind = await r.vault.totalAssets();
                        positionTotalOUSD = await r.cdp.getOUSDTotal(nftIdFirstPosition);
                        positionShares = await r.cdp.getShares(nftIdFirstPosition);
                        positionExpectedOUSDTotalPlusInterest = await r.vault.convertToAssets(positionShares);
                        positionInterestEarned = positionExpectedOUSDTotalPlusInterest.sub(positionTotalOUSD);
                        userExistingOUSDValueBeforeUnwind = await r.externalOUSD.balanceOf(endUserSigner.address);

                        await coordinator.unwindLeveragedOUSD(nftIdFirstPosition, endUserSigner.address);
                    });

                    it(`Should reduce assets in Vault by the entire OUSD amount of
                        position (principle, leveraged and interest)`, async function () {
                        expect(await r.vault.totalAssets()).to.equal(
                            vaultOUSDAmountBeforeUnwind.sub(positionExpectedOUSDTotalPlusInterest));
                    });
                    it("Should transfer principle plus interest to user", async function () {
                        const userExpectedOUSDBalance = parseFloat(ethers.utils.formatEther(
                            addr1CollateralAmount.add(positionInterestEarned).add(userExistingOUSDValueBeforeUnwind).sub(originationFee)));
                        const userActualOUSDBalance = parseFloat(ethers.utils.formatEther(
                            await r.externalOUSD.balanceOf(endUserSigner.address)));
                        expect(userActualOUSDBalance).to.be.closeTo(
                            userExpectedOUSDBalance, 1.5);
                    });
                    it("Should have deleted CDP position", async function () {
                        /// a view method does not revert but just throw an exception.
                        try {
                            await r.cdp.getOUSDPrinciple(nftIdFirstPosition);
                            assert.fail("Error - Getting CDP OUSD Principle on a deleted position must throw exception");
                        } catch (e) {}
                    });

                    // TODO : Once exchanger is up, need to check that lvUSD was returned to coordinator address
                });
            });
        });
    });

    // Comment out till exchanger is done as unwind will not work well. Might be able to remove once we have integration tests

    describe("Coordinator overview testing", function () {
        const endToEndTestNFTId = 34674675;
        const collateralAmount = ethers.utils.parseEther("50");
        const mintedLvUSDAmount = ethers.utils.parseEther("100000");
        let leverageToGetForPosition;
        let originationFeeAmount;
        let depositedLeveragedOUSD;
        before(async function () {
            // start with a clean setup
            await helperResetNetwork(defaultBlockNumber);
            r = await buildContractTestContext();
            endUserSigner = r.owner;
            sharesOwnerAddress = r.coordinator.address;
            const tempFakeExchangerAddr = r.addr2;
            await helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseUnits("8.0"));
            await helperSwapETHWithOUSD(tempFakeExchangerAddr, ethers.utils.parseUnits("8.0"));
            // Get some helpful values for tests
            leverageToGetForPosition = await r.parameterStore.getAllowedLeverageForPosition(collateralAmount, 5);
            originationFeeAmount = await r.parameterStore.calculateOriginationFee(leverageToGetForPosition);
            depositedLeveragedOUSD = leverageToGetForPosition.sub(originationFeeAmount);
            /// setup test environment
            /// 1. Transfer OUSD principle from user to coordinator address (simulate leverage engine task when creating position)
            /// 3. Mint enough lvUSD under coordinator address to get leveraged OUSD (via lvUSD borrowing)
            await r.externalOUSD.connect(endUserSigner).transfer(r.coordinator.address, collateralAmount);
            await r.lvUSD.mint(r.coordinator.address, mintedLvUSDAmount);
            /// Complete create position cycle from coordinator perspective
            await r.externalOUSD.approve(r.coordinator.address, collateralAmount);
            await r.coordinator.depositCollateralUnderNFT(endToEndTestNFTId, collateralAmount);
            /// Doing 5 cycles for this position
            await r.coordinator.getLeveragedOUSD(endToEndTestNFTId, leverageToGetForPosition);
        });

        it("Should have updated CDP getOUSDPrinciple with values for leveraged position", async function () {
            expect(await r.cdp.getOUSDPrinciple(endToEndTestNFTId)).to.equal(collateralAmount);
        });

        it("Should have updated CDP getOUSDInterestEarned with values for leveraged position", async function () {
            expect(await r.cdp.getOUSDInterestEarned(endToEndTestNFTId)).to.equal(0);
        });

        it("Should have updated CDP getOUSDTotal with values for leveraged position", async function () {
            expect(getFloatFromBigNum(await r.cdp.getOUSDTotal(endToEndTestNFTId)))
                .to.closeTo(getFloatFromBigNum(collateralAmount.add(depositedLeveragedOUSD)), 10);
        });

        it("Should have updated CDP getLvUSDBorrowed with values for leveraged position", async function () {
            expect(await r.cdp.getLvUSDBorrowed(endToEndTestNFTId)).to.equal(leverageToGetForPosition);
        });

        it("Should have updated CDP getShares with values for leveraged position", async function () {
            expect(getFloatFromBigNum(await r.cdp.getShares(endToEndTestNFTId)))
                .to.closeTo(getFloatFromBigNum(collateralAmount.add(depositedLeveragedOUSD)), 10);
        });

        it("Should have emptied coordinator OUSD reserves (they need to go to Vault)", async function () {
            expect(getFloatFromBigNum(await r.externalOUSD.balanceOf(r.coordinator.address))).to.closeTo(0, 10);
        });

        it("Should have deposited principle plus leveraged OUSD into Vault minus origination fees", async function () {
            expect(getFloatFromBigNum(await r.vault.totalAssets()))
                .to.closeTo(getFloatFromBigNum(collateralAmount.add(depositedLeveragedOUSD)), 10);
        });

        it("Should have transferred lvUSD out of coordinator minted amount", async function () {
            expect(await r.lvUSD.balanceOf(r.coordinator.address)).to.equal(mintedLvUSDAmount.sub(leverageToGetForPosition));
        });
    });
});
