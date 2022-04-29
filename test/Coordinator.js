const { expect } = require('chai');
const { ethers } = require('hardhat');
const mainnetHelper = require('./MainnetHelper');
const { ContractTestContext } = require('./ContractTestContext');
// const { MAX_UINT256 } = require('@openzeppelin/test-helpers/src/constants');
// const ether = require('@openzeppelin/test-helpers/src/ether');

const originationFeeDefaultValue = ethers.utils.parseEther('0.05');

describe('Coordinator Test suit', function () {
    let r;
    let coordinator;
    let endUserSigner;
    // let addr2;
    // let leverageEngineSigner;
    const nftIdFirstPosition = 35472;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);

        r = new ContractTestContext();
        await r.setup();

        // Object under test
        coordinator = r.coordinator;
        endUserSigner = r.addr1;
        // addr2 = r.addr2;
        // leverageEngineSigner = r.owner;

        await mainnetHelper.helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseEther('5.0'));
    });

    describe('Get and update leverage related values', function () {
        it('Should have default value for globalCollateralRate', async function () {
            expect(await coordinator.getGlobalCollateralRate()).to.equal(90);
        });

        it('Should have default value for maxNumberOfCycles', async function () {
            expect(await coordinator.getMaxNumberOfCycles()).to.equal(10);
        });

        it('Should update globalCollateralRate', async function () {
            await coordinator.changeGlobalCollateralRate(80);
            expect(await coordinator.getGlobalCollateralRate()).to.equal(80);
        });

        it('Should revert if new globalCollateralRate is higher then 100', async function () {
            await expect(coordinator.changeGlobalCollateralRate(120)).to.revertedWith(
                'globalCollateralRate must be a number between 1 and 100',
            );
        });

        it('Should update maxNumberOfCycles', async function () {
            await coordinator.changeMaxNumberOfCycles(12);
            expect(await coordinator.getMaxNumberOfCycles()).to.equal(12);
        });
    });

    describe('Calculate allowed leverage', function () {
        beforeEach(async function () {
            /// values are not being reset on mainnet fork after describe/it so need to reset to default
            await coordinator.changeGlobalCollateralRate(90);
            await coordinator.changeMaxNumberOfCycles(10);
        });
        it('Should return zero if no cycles', async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther('100'), 0)).to.equal(
                ethers.utils.parseEther('0'),
            );
        });
        it('Should calculate allowed leverage for 2 cycles', async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther('100'), 2)).to.equal(
                ethers.utils.parseEther('171'),
            );
        });
        it('Should calculate allowed leverage for 3 cycles', async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther('100'), 3)).to.equal(
                ethers.utils.parseEther('243.9'),
            );
        });
        it('Should calculate allowed leverage for 5 cycles', async function () {
            expect(await coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther('100'), 5)).to.equal(
                ethers.utils.parseEther('368.559'),
            );
        });
        it('Should revert if number of cycles is bigger then allowed max', async function () {
            await expect(
                coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther('100'), 20),
            ).to.be.revertedWith('Number of cycles must be lower then allowed max');
        });
    });

    it('Should have default value for treasury address', async function () {
        const returnedTreasuryAddress = await coordinator.getTreasuryAddress();
        expect(returnedTreasuryAddress).to.equal(r.treasurySigner.address);
    });

    describe('Change treasury address', function () {
        /// Note : when we have access control, check that only admin can change it
        const newTreasurySigner = ethers.Wallet.createRandom();
        before(async function () {
            await coordinator.changeTreasuryAddress(newTreasurySigner.address);
        });
        it('should have updated treasury address', async function () {
            const returnedTreasuryAddress = await coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address);
        });
    });

    it('Should have default origination fee value', async function () {
        const defaultOriginationFeeRate = await coordinator.getOriginationFeeRate();
        expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue);
    });

    describe('Change origination fee', function () {
        // Note : when we have access control, check that only admin can change it
        // 0.01 equals to 1%
        const newOriginationFeeRate = ethers.utils.parseEther('0.01');
        before(async function () {
            await coordinator.changeOriginationFeeRate(newOriginationFeeRate);
        });
        it('should have updated treasury address', async function () {
            const returnedOriginationFee = await coordinator.getOriginationFeeRate();
            expect(returnedOriginationFee).to.equal(newOriginationFeeRate);
        });
    });

    describe('Deposit collateral into new NFT position', function () {
        // depositing collateral is expected to transfer funds to vault,
        // shares to be minted and create a new CDP entry with valid values
        const collateralAmount = ethers.utils.parseEther('1');
        let sharesOwnerAddress;
        before(async function () {
            sharesOwnerAddress = coordinator.address; // shares will be given to coordinator
            // transfer OUSD from user to coordinator address
            // (this will happen in leverage engine in full Archimedes flow)
            await r.externalOUSD.connect(endUserSigner).transfer(coordinator.address, collateralAmount);
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(collateralAmount);

            await coordinator.depositCollateralUnderNFT(nftIdFirstPosition, collateralAmount, sharesOwnerAddress, {
                gasLimit: 3000000,
            });
        });

        it('Should have transferred collateral out of coordinator address', async function () {
            expect(await r.externalOUSD.balanceOf(coordinator.address)).to.equal(0);
        });
        it('Should have increased vault balance on OUSD', async function () {
            expect(await r.externalOUSD.balanceOf(r.vault.address)).to.equal(collateralAmount);
        });
        it('Should have increased OUSD in the vault', async function () {
            expect(await r.vault.totalAssets()).to.equal(collateralAmount);
        });

        it('Should have given shares to shares owner', async function () {
            expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(collateralAmount);
        });

        it('Should create entry in CDP with principle', async function () {
            expect(await r.cdp.getOUSDPrinciple(nftIdFirstPosition)).to.equal(collateralAmount);
        });
    });
});
