const { expect } = require("chai");
const { ethers } = require("hardhat");

module.exports.collateralTests = function (r) {
    describe("Deposit collateral into new NFT position", function () {
        /// depositing collateral is expected to transfer funds to vault, shares to be minted and create a new CDP entry with valid values
        const collateralAmount = ethers.utils.parseEther("1");
        const endUserSigner = r.addr1;
        const coordinator = r.coordinator;
        const sharesOwnerAddress = coordinator.address;
        const nftIdFirstPosition = 35472;

        before(async function () {
            // transfer OUSD from user to coordinator address (this will happen in leverage engine in full Archimedes flow)
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
    });
};
