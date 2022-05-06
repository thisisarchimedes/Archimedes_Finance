import { expect } from "chai";
import { ethers } from "hardhat";
import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber } from "./MainnetHelper";
import { ContractTestContext } from "./ContractTestContext";

describe("Coordinator Test suit", function () {
    let r;
    let endUserSigner;
    let sharesOwnerAddress;
    let coordinator;
    const nftIdAddr1Position = 35472;
    const nftIdAddr2Position = 15426;

    before(async function () {
        helperResetNetwork(defaultBlockNumber);

        r = new ContractTestContext();
        await r.setup();

        endUserSigner = r.addr1;
        // Object under test
        coordinator = r.coordinator;
        sharesOwnerAddress = coordinator.address;

        await helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseEther("5.0"));
        await helperSwapETHWithOUSD(r.addr2, ethers.utils.parseEther("5.0"));
    });

    describe("Deposit collateral into new NFT position", function () {
        /// depositing collateral is expected to transfer funds to vault
        // shares to be minted and create a new CDP entry with valid values
        const addr1CollateralAmount = ethers.utils.parseEther("1");
        const addr2CollateralAmount = ethers.utils.parseEther("2");
        const combinedCollateralAmount = addr1CollateralAmount.add(addr2CollateralAmount);
        /* Shares and assets always increase by the same amount in our vault (both are equal) because
           only one user (coordinator) is depositing. Each time a deposit takes place the shares for the
           deposit are stored in CDPosition. Therefore the amount of shares is equal to the collateral: */
        before(async function () {
            // transfer OUSD from user to coordinator address
            // (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, addr1CollateralAmount);
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr1CollateralAmount);

            await coordinator.depositCollateralUnderNFT(nftIdAddr1Position, addr1CollateralAmount, sharesOwnerAddress, {
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

        describe("Separate deposits made by another user", function () {
            before(async function () {
                // transfer OUSD from user to coordinator address
                // (this will happen in leverage engine in full Archimedes flow)
                await r.externalOUSD.connect(r.addr2).transfer(coordinator.address, addr2CollateralAmount);
                expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr2CollateralAmount);

                await coordinator.depositCollateralUnderNFT(
                    nftIdAddr2Position, addr2CollateralAmount, sharesOwnerAddress, { gasLimit: 3000000 },
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
                const rebaseAmount = ethers.utils.parseEther("1");
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
            const lvUSDAmountToBorrow = ethers.utils.parseEther("2");
            const nftIdFirstPosition = 35472;

            before(async function () {
                // mint lvUSD to be borrowed, assign all minted lvUSD to coordinator as it will spend it
                await r.lvUSD.mint(coordinator.address, ethers.utils.parseEther("100"));
                // method under test
                await coordinator.borrowUnderNFT(nftIdFirstPosition, lvUSDAmountToBorrow);
            });
            it("Should transfer lvUSD to exchanger address", async function () {
                /// general note - "borrowed" lvUSD is assigned to exchanger
                expect(await r.lvUSD.balanceOf(r.exchanger.address)).to.equal(lvUSDAmountToBorrow);
            });
            it("Should decrease coordinator lvUSD balance", async function () {
                /// we expect coordinator to have 98 ethers since we started with 100 ether lvUSD and borrowed 2 ethers
                expect(await r.lvUSD.balanceOf(coordinator.address)).to.equal(ethers.utils.parseEther("98"));
            });
            it("Should update CDP with borrowed lvUSD", async function () {
                expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(lvUSDAmountToBorrow);
            });
            it("Should fail to borrow if trying to borrow more lvUSD token then are under coordinator address",
                async function () {
                    await expect(
                        coordinator.borrowUnderNFT(nftIdFirstPosition, ethers.utils.parseEther("200")),
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });

            describe("Repay lvUSD for position", function () {
                const lvUSDAmountToRepayInTwoParts = ethers.utils.parseEther("1");
                before(async function () {
                    // method under test
                    await coordinator.repayUnderNFT(nftIdFirstPosition, lvUSDAmountToRepayInTwoParts);
                });
                it("Should transfer lvUSD to coordinator address", async function () {
                    /// we expect coordinator to have 98 ethers since we started with 100 ether lvUSD and
                    /// borrowed 2 ethers and also repayed 1 ether
                    expect(await r.lvUSD.balanceOf(coordinator.address)).to.equal(ethers.utils.parseEther("99"));
                });
                it("Should decrease Vault's lvUSD balance", async function () {
                    // Exchanger should still have half the lvUSD under it
                    expect(await r.lvUSD.balanceOf(r.exchanger.address)).to.equal(lvUSDAmountToRepayInTwoParts);
                });
                it("Should update CDP with repayed lvUSD", async function () {
                    expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(lvUSDAmountToRepayInTwoParts);
                });
                /// add test for when we try to repay more then we have
                it("Should revert if trying to repay more then borrowed lvUSD", async function () {
                    await expect(coordinator.repayUnderNFT(nftIdFirstPosition, ethers.utils.parseEther("100")))
                        .to.be.revertedWith("Coordinator : Cannot repay more lvUSD then is borrowed");
                });
            });

            describe("Get leveraged OUSD for position", function () {
                const leverageAmount = addr1CollateralAmount;
                let depositedOUSDBeforeLeverage;
                let sharesTotalSupplyBeforeLeverage;
                let borrowedLvUSDInPositionBeforeLeverage;
                before(async function () {
                    /// Get initial state
                    borrowedLvUSDInPositionBeforeLeverage = await r.cdp.getLvUSDBorrowed(nftIdFirstPosition);
                    /// Test artifact only, Once exchanger is functional we can use the exchange and
                    /// transfer OUSD directly to coordinator
                    await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, leverageAmount);
                    // method under test
                    depositedOUSDBeforeLeverage = await r.vault.totalAssets();
                    sharesTotalSupplyBeforeLeverage = await r.vault.maxRedeem(sharesOwnerAddress);
                    await coordinator.getLeveragedOUSD(nftIdFirstPosition, leverageAmount, sharesOwnerAddress);
                });
                it("Should have increase borrowed amount on CDP for NFT", async function () {
                    expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(
                        borrowedLvUSDInPositionBeforeLeverage.add(leverageAmount));
                });
                it("Should have increased OUSD deposited in vault", async function () {
                    expect(await r.vault.totalAssets()).to.equal(leverageAmount.add(depositedOUSDBeforeLeverage));
                });
                it("Should have minted (more) shares to owner address", async function () {
                    expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.gt(
                        sharesTotalSupplyBeforeLeverage);
                });
                it("Should have increased deposited (or totalOUSD) OUSD in CDPosition", async function () {
                    const existingOUSDBeforeLeverage = addr1CollateralAmount;
                    expect(await r.cdp.getOUSDTotal(nftIdFirstPosition))
                        .to.equal(leverageAmount.add(existingOUSDBeforeLeverage));
                });
                it("Should have update CDPosition with shares", async function () {
                    // When getting leveraged OUSD and depositing it into Vault, shares are not always one to one
                    // (based on a math calculation in Vault). The value below is what we expect to
                    // get at this state of the vault
                    const numberOfSharesFromLeverage = ethers.BigNumber.from("750000000000000000");
                    expect(await r.cdp.getShares(nftIdFirstPosition))
                        .to.equal(numberOfSharesFromLeverage.add(addr1CollateralAmount));
                });
            });
        });
    });

    describe("allowed leverage tests", function () {
        describe("Get and update leverage related values", function () {
            it("Should have default value for globalCollateralRate", async function () {
                expect(await r.coordinator.getGlobalCollateralRate()).to.equal(90);
            });

            it("Should have default value for maxNumberOfCycles", async function () {
                expect(await r.coordinator.getMaxNumberOfCycles()).to.equal(10);
            });

            it("Should update globalCollateralRate", async function () {
                await r.coordinator.changeGlobalCollateralRate(80);
                expect(await r.coordinator.getGlobalCollateralRate()).to.equal(80);
            });

            it("Should revert if new globalCollateralRate is higher then 100", async function () {
                await expect(r.coordinator.changeGlobalCollateralRate(120)).to.revertedWith(
                    "globalCollateralRate must be a number between 1 and 100",
                );
            });

            it("Should update maxNumberOfCycles", async function () {
                await r.coordinator.changeMaxNumberOfCycles(12);
                expect(await r.coordinator.getMaxNumberOfCycles()).to.equal(12);
            });
        });

        describe("Calculate allowed leverage", function () {
            beforeEach(async function () {
                /// values are not being reset on mainnet fork after describe/it so need to reset to default
                await r.coordinator.changeGlobalCollateralRate(90);
                await r.coordinator.changeMaxNumberOfCycles(10);
            });
            it("Should return zero if no cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 0)).to.equal(
                    ethers.utils.parseEther("0"),
                );
            });
            it("Should calculate allowed leverage for 2 cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 2)).to.equal(
                    ethers.utils.parseEther("171"),
                );
            });
            it("Should calculate allowed leverage for 3 cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 3)).to.equal(
                    ethers.utils.parseEther("243.9"),
                );
            });
            it("Should calculate allowed leverage for 5 cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 5)).to.equal(
                    ethers.utils.parseEther("368.559"),
                );
            });
            it("Should revert if number of cycles is bigger then allowed max", async function () {
                await expect(
                    r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 20),
                ).to.be.revertedWith("Number of cycles must be lower then allowed max");
            });
        });
    });

    describe("Admin changes for coordinator", function () {
        const originationFeeDefaultValue = ethers.utils.parseEther("0.05");
        it("Should have default value for treasury address", async function () {
            const returnedTreasuryAddress = await r.coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(r.treasurySigner.address);
        });

        describe("Change treasury address", function () {
            /// Note : when we have access control, check that only admin can change it
            const newTreasurySigner = ethers.Wallet.createRandom();
            before(async function () {
                await r.coordinator.changeTreasuryAddress(newTreasurySigner.address);
            });
            it("should have updated treasury address", async function () {
                const returnedTreasuryAddress = await r.coordinator.getTreasuryAddress();
                expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address);
            });
        });

        it("Should have default origination fee value", async function () {
            const defaultOriginationFeeRate = await r.coordinator.getOriginationFeeRate();
            expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue);
        });

        describe("Change origination fee", function () {
            // Note : when we have access control, check that only admin can change it
            // 0.01 equals to 1%
            const newOriginationFeeRate = ethers.utils.parseEther("0.01");
            before(async function () {
                await r.coordinator.changeOriginationFeeRate(newOriginationFeeRate);
            });
            it("should have updated treasury address", async function () {
                const returnedOriginationFee = await r.coordinator.getOriginationFeeRate();
                expect(returnedOriginationFee).to.equal(newOriginationFeeRate);
            });
        });
    });
});
