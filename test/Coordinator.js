const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require('./MainnetHelper');
const { ContractTestContext } = require('./ContractTestContext');
const { MAX_UINT256 } = require("@openzeppelin/test-helpers/src/constants");


const originationFeeDefaultValue = ethers.utils.parseEther("0.05")

describe("Coordinator Test suit", function () {
    let r;
    let coordinator;
    let endUserSigner
    let addr2
    let leverageEngineSigner
    const nftIdFirstPosition = 35472

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber)

        r = new ContractTestContext();
        await r.setup();

        // Object under test 
        coordinator = r.coordinator
        endUserSigner = r.addr1
        addr2 = r.addr2
        leverageEngineSigner = r.owner

        await mainnetHelper.helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseEther("5.0"))
    })

    it("Should have default value for treasury address", async function () {
        let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
        expect(returnedTreasuryAddress).to.equal(r.treasurySigner.address)
    })

    describe("Change treasury address", function () {
        /// Note : when we have access control, check that only admin can change it
        let newTreasurySigner = ethers.Wallet.createRandom()
        before(async function () {
            await coordinator.changeTreasuryAddress(newTreasurySigner.address);
        })
        it("should have updated treasury address", async function () {
            let returnedTreasuryAddress = await coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address)
        })
    })

    it("Should have default origination fee value", async function () {
        let defaultOriginationFeeRate = await coordinator.getOriginationFeeRate();
        expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue)
    })

    describe("Change origination fee", function () {
        // Note : when we have access control, check that only admin can change it
        // 0.01 equals to 1%
        let newOriginationFeeRate = ethers.utils.parseEther("0.01")
        before(async function () {
            await coordinator.changeOriginationFeeRate(newOriginationFeeRate)
        })
        it("should have updated treasury address", async function () {
            let returnedOriginationFee = await coordinator.getOriginationFeeRate();
            expect(returnedOriginationFee).to.equal(newOriginationFeeRate)
        })
    })

    describe("Deposit collateral into new NFT position", function () {
        /// depositing collateral is expected to transfer funds to vault, shares to be minted and create a new CDP entry with valid values
        const collateralAmount = ethers.utils.parseEther("1")
        let sharesOwnerAddress
        before(async function () {
            sharesOwnerAddress = coordinator.address // shares will be given to coordinator 
            // transfer OUSD from user to coordinator address (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, collateralAmount)
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(collateralAmount)

            await coordinator.depositCollateralUnderNFT(nftIdFirstPosition,
                collateralAmount, sharesOwnerAddress, { gasLimit: 3000000 })
        })

        it("Should have transferred collateral out of coordinator address", async function () {
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(0)
        })
        it("Should have increased vault balance on OUSD", async function () {
            expect(await r.externalOUSD.balanceOf(r.vault.address)).to.equal(collateralAmount)
        })
        it("Should have increased OUSD in the vault", async function () {
            expect(await r.vault.totalAssets()).to.equal(collateralAmount)
        })

        it("Should have given shares to shares owner", async function () {
            expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(collateralAmount)
        })

        it("Should create entry in CDP with principle", async function () {
            expect(await r.cdp.getOUSDPrinciple(nftIdFirstPosition)).to.equal(collateralAmount);

        })

    })
})
