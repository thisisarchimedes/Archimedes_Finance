const { expect, util } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");

describe("Coordinator Test suit", function () {
    let r;
    let endUserSigner;
    let sharesOwnerAddress;
    let coordinator;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);

        r = new ContractTestContext();
        await r.setup();

        endUserSigner = r.addr1;
        coordinator = r.coordinator;
        sharesOwnerAddress = coordinator.address;

        await mainnetHelper.helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseEther("5.0"));
    });

    describe("Deposit collateral into new NFT position", function () {
        // depositing collateral is expected to transfer funds to vault,
        // shares to be minted and create a new CDP entry with
        // valid values
        const collateralAmount = ethers.utils.parseEther("1");
        const nftIdFirstPosition = 35472;

        before(async function () {
            // transfer OUSD from user to coordinator address
            // (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, collateralAmount);
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(collateralAmount);

            await coordinator.depositCollateralUnderNFT(nftIdFirstPosition, collateralAmount, sharesOwnerAddress, {
                gasLimit: 3000000,
            });
        });

        it("Should have transferred collateral out of coordinator address", async function () {
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(0);
        });
        it("Should have increased vault balance on OUSD", async function () {
            expect(await r.externalOUSD.balanceOf(r.vault.address)).to.equal(collateralAmount);
        });
        it("Should have increased OUSD in the vault", async function () {
            expect(await r.vault.totalAssets()).to.equal(collateralAmount);
        });

        it("Should have given shares to shares owner", async function () {
            expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(collateralAmount);
        });

        it("Should create entry in CDP with principle", async function () {
            expect(await r.cdp.getOUSDPrinciple(nftIdFirstPosition)).to.equal(collateralAmount);
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
                const leverageAmount = collateralAmount;
                let currentBorrowedLvUSDInPosition;
                // const totalOUSDAmount = collateralAmount + collateralAmount;
                before(async function () {
                    /// Get initial state
                    currentBorrowedLvUSDInPosition = await r.cdp.getLvUSDBorrowed(nftIdFirstPosition);
                    /// Test artifact only, Once exchanger is functional we can use the exchange and
                    /// transfer OUSD directly to coordinator
                    await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, leverageAmount);
                    // method under test
                    await coordinator.getLeveragedOUSD(nftIdFirstPosition, leverageAmount, sharesOwnerAddress);
                });
                it("Should have increase borrowed amount on CDP for NFT", async function () {
                    expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(
                        currentBorrowedLvUSDInPosition.add(leverageAmount));
                });
                it("Should have increased OUSD deposited in vault", async function () {
                    expect(await r.vault.totalAssets()).to.equal(leverageAmount.add(collateralAmount));
                });
                it("Should have minted (more) shares to owner address", async function () {
                    expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(
                        leverageAmount.add(collateralAmount));
                });
                it("Should have increased deposited OUSD in CDPosition", async function () {
                    expect(await r.cdp.getOUSDTotal(nftIdFirstPosition)).to.equal(leverageAmount.add(collateralAmount));
                });
                /// Add test for shares
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
