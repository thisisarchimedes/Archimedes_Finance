const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");
const { MAX_UINT256 } = require("@openzeppelin/test-helpers/src/constants");
const ether = require("@openzeppelin/test-helpers/src/ether");

const originationFeeDefaultValue = ethers.utils.parseEther("0.05");

describe("Coordinator Test suit", function () {
    let r;
    let coordinator;
    let leverageEngineSigner;
    const nftIdAddr1Position = 35472;
    const nftIdAddr2Position = 15426;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);

        r = new ContractTestContext();
        await r.setup();

        // Object under test
        coordinator = r.coordinator;
        leverageEngineSigner = r.owner;

        await mainnetHelper.helperSwapETHWithOUSD(r.addr1, ethers.utils.parseEther("5.0"));
        await mainnetHelper.helperSwapETHWithOUSD(r.addr2, ethers.utils.parseEther("5.0"));
    });

    describe("Get and update leverage related values", function () {
        it("Should have default value for globalCollateralRate", async function () {
            expect(await coordinator.getGlobalCollateralRate()).to.equal(90);
        });

        it("Should have default value for maxNumberOfCycles", async function () {
            expect(await coordinator.getMaxNumberOfCycles()).to.equal(10);
        });

        it("Should update globalCollateralRate", async function () {
            await coordinator.changeGlobalCollateralRate(80);
            expect(await coordinator.getGlobalCollateralRate()).to.equal(80);
        });

        it("Should revert if new globalCollateralRate is higher then 100", async function () {
            await expect(coordinator.changeGlobalCollateralRate(120)).to.revertedWith(
                "globalCollateralRate must be a number between 1 and 100"
            );
        });

        it("Should update maxNumberOfCycles", async function () {
            await coordinator.changeMaxNumberOfCycles(12);
            expect(await coordinator.getMaxNumberOfCycles()).to.equal(12);
        });
    });

    describe("Calculate allowed leverage", function () {
        beforeEach(async function () {
            /// values are not being reset on mainnet fork after describe/it so need to reset to default
            await coordinator.changeGlobalCollateralRate(90);
            await coordinator.changeMaxNumberOfCycles(10);
        });
        it("Should return zero if no cycles", async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 0)).to.equal(
                ethers.utils.parseEther("0")
            );
        });
        it("Should calculate allowed leverage for 2 cycles", async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 2)).to.equal(
                ethers.utils.parseEther("171")
            );
        });
        it("Should calculate allowed leverage for 3 cycles", async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 3)).to.equal(
                ethers.utils.parseEther("243.9")
            );
        });
        it("Should calculate allowed leverage for 5 cycles", async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 5)).to.equal(
                ethers.utils.parseEther("368.559")
            );
        });
        it("Should revert if number of cycles is bigger then allowed max", async function () {
            await expect(
                coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 20)
            ).to.be.revertedWith("Number of cycles must be lower then allowed max");
        });
    });

    it("Should have default value for treasury address", async function () {
        let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
        expect(returnedTreasuryAddress).to.equal(r.treasurySigner.address);
    });

    describe("Change treasury address", function () {
        /// Note : when we have access control, check that only admin can change it
        let newTreasurySigner = ethers.Wallet.createRandom();
        before(async function () {
            await coordinator.changeTreasuryAddress(newTreasurySigner.address);
        });
        it("should have updated treasury address", async function () {
            let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address);
        });
    });

    it("Should have default origination fee value", async function () {
        let defaultOriginationFeeRate = await coordinator.getOriginationFeeRate();
        expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue);
    });

    describe("Change origination fee", function () {
        // Note : when we have access control, check that only admin can change it
        // 0.01 equals to 1%
        let newOriginationFeeRate = ethers.utils.parseEther("0.01");
        before(async function () {
            await coordinator.changeOriginationFeeRate(newOriginationFeeRate);
        });
        it("should have updated treasury address", async function () {
            let returnedOriginationFee = await coordinator.getOriginationFeeRate();
            expect(returnedOriginationFee).to.equal(newOriginationFeeRate);
        });
    });

    describe("Deposit collateral into new NFT position", function () {
        /// depositing collateral is expected to transfer funds to vault, shares to be minted and create a new CDP entry with valid values
        const addr1CollateralAmount = ethers.utils.parseEther("1");
        const addr2CollateralAmount = ethers.utils.parseEther("2");
        /* Shares and assets always increase by the same amount in our vault (both are equal) because
           only one user (coordinator) is depositing. Each time a deposit takes place the shares for the
           deposit are stored in CDPosition. Therefore the amount of shares is equal to the collateral: */
        const addr1Shares = addr1CollateralAmount;
        const addr2Shares = addr2CollateralAmount;
        const threeEth = ethers.utils.parseEther("2");
        let sharesOwnerAddress;
        before(async function () {
            console.log('running first before');
            sharesOwnerAddress = coordinator.address; // shares will be given to coordinator
            // transfer OUSD from user to coordinator address (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(r.addr1).transfer(coordinator.address, addr1CollateralAmount);
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
            console.log('balance 1', balance)
            expect(balance).to.equal(addr1CollateralAmount)
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

        describe("Separate deposits made by another user", function() {
            before(async function () {
                console.log('running second before')
                // transfer OUSD from user to coordinator address (this will happen in leverage engine in full Archimedes flow)
                await r.externalOUSD.connect(r.addr2).transfer(coordinator.address, addr2CollateralAmount);
                expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(addr2CollateralAmount);
    
                await coordinator.depositCollateralUnderNFT(nftIdAddr2Position, addr2CollateralAmount, sharesOwnerAddress, {
                    gasLimit: 3000000,
                });
            });

            const combinedCollateralAmount = addr1CollateralAmount.add(addr2CollateralAmount);
            it("Should have increased vault balance on OUSD by second collateral amount", async function () {
                const balance = await r.externalOUSD.balanceOf(r.vault.address);
                console.log('balance 2', balance)
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
            it("Vault should contain the correct number of shares after a rebase event", async function () {
                console.log({
                    addr3: r.addr3.address,
                    vaultAddr: r.vault.address,
                })
                await mainnetHelper.helperSwapETHWithOUSD(r.addr3, ethers.utils.parseEther("1"));
                console.log('done swapping')
                console.log(r.externalOUSD);
                // await r.externalOUSD.connect(r.addr3).approve(r.vault.address, ethers.utils.parseEther("1"));
                await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, ethers.utils.parseEther("1"));
                // const totalShares = await r.vault.totalSupply();
                // console.log({ totalShares });
            });
        })
    });
});
