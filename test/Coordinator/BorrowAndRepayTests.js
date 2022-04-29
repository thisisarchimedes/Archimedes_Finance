const { expect } = require("chai");
const { ethers } = require("hardhat");

module.exports.borrowAndRepayTests = function (r) {
    const coordinator = r.coordinator;
    const nftIdFirstPosition = 35472;
    endUserSigner = r.addr1;

    describe("Borrow lvUSD for position", function () {
        let lvUSDAmountToBorrow = ethers.utils.parseEther("2");
        before(async function () {
            // mint lvUSD to be borrowed, assign all minted lvUSD to coordinator as it will spend it
            await r.lvUSD.mint(coordinator.address, ethers.utils.parseEther("100"));
            // method under test
            await coordinator.borrowUnderNFT(nftIdFirstPosition, lvUSDAmountToBorrow);
        });
        it("Should transfer lvUSD to vaults address", async function () {
            /// general note - "used" lvUSD is assigned to vault
            expect(await r.lvUSD.balanceOf(r.vault.address)).to.equal(lvUSDAmountToBorrow);
        });
        it("Should decrease coordinator lvUSD balance", async function () {
            expect(await r.lvUSD.balanceOf(coordinator.address)).to.equal(ethers.utils.parseEther("98"));
        });
        it("Should update CDP with borrowed lvUSD", async function () {
            expect(await r.cdp.getLvUSDBorrowed(nftIdFirstPosition)).to.equal(lvUSDAmountToBorrow);
        });
        it("Should fail to borrow if trying to borrow more lvUSD token then are under coordinator address", async function () {
            await expect(
                coordinator.borrowUnderNFT(nftIdFirstPosition, ethers.utils.parseEther("200"))
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });
    });
};
