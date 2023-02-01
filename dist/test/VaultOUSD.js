"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const MainnetHelper_1 = require("./MainnetHelper");
const ContractTestContext_1 = require("./ContractTestContext");
const getDecimal = (naturalNumber) => {
    return hardhat_1.ethers.utils.parseUnits(naturalNumber.toString());
};
const getFloatFromBigNum = (bigNumValue) => {
    return parseFloat(hardhat_1.ethers.utils.formatEther(bigNumValue));
};
describe("VaultOUSD test suit", function () {
    let r;
    let sharesOwnerAddress;
    const addr1Deposit = 10;
    const addr2Deposit = 20;
    const interestIntoVault = 10;
    async function setupAndResetState() {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        // Mint initial amount on OUSD token, will be used by all tests
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.addr1, hardhat_1.ethers.utils.parseUnits("1.0"));
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.addr2, hardhat_1.ethers.utils.parseUnits("1.0"));
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.addr3, hardhat_1.ethers.utils.parseUnits("2.0"));
        await (0, MainnetHelper_1.helperSwapETHWithOUSD)(r.owner, hardhat_1.ethers.utils.parseUnits("1.0"));
        sharesOwnerAddress = r.owner.address;
        // deposit OUSD as a user (that gets shares) into vault. Shares goes to owner, not user.
        await r.externalOUSD.connect(r.addr1).approve(r.vault.address, getDecimal(addr1Deposit));
        await r.vault.setExecutive(r.addr1.address);
        await r.vault.connect(r.addr1).archimedesDeposit(getDecimal(addr1Deposit), sharesOwnerAddress);
        await r.externalOUSD.connect(r.addr2).approve(r.vault.address, getDecimal(addr2Deposit));
        await r.vault.setExecutive(r.addr2.address);
        await r.vault.connect(r.addr2).archimedesDeposit(getDecimal(addr2Deposit), sharesOwnerAddress);
        await r.vault.setExecutive(r.owner.address);
    }
    describe("Addr1 and addr2 signer deposited OUSD into vault", function () {
        before(async function () {
            await setupAndResetState();
        });
        it("Should return OUSD to be Vault's asset", async function () {
            const vaultAsset = await r.vault.asset();
            (0, chai_1.expect)(vaultAsset).to.equal(MainnetHelper_1.addressOUSD);
        });
        it("Should have an updated total assets sum after deposit", async function () {
            (0, chai_1.expect)(await r.vault.totalAssets()).to.equal(getDecimal(addr1Deposit + addr2Deposit));
        });
        it("Should have all shares under owners address", async function () {
            (0, chai_1.expect)(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(getDecimal(addr1Deposit + addr2Deposit));
        });
        describe("Adding more money to vault as interest (ie no shares are minted)", function () {
            before(async function () {
                // increase Vaults balance without minting more shares
                await r.externalOUSD.transfer(r.vault.address, getDecimal(interestIntoVault));
                (0, chai_1.expect)(await r.externalOUSD.balanceOf(r.vault.address)).to.equal(getDecimal(addr1Deposit + addr2Deposit + interestIntoVault));
            });
            it("Should show interest plus deposited in total assets", async function () {
                (0, chai_1.expect)(await r.vault.totalAssets()).to.equal(getDecimal(addr1Deposit + addr2Deposit + interestIntoVault));
            });
            it("Should not change number of shares per deposit", async function () {
                /// Check the max number of share owner has
                (0, chai_1.expect)(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(getDecimal(addr1Deposit + addr2Deposit));
            });
            it("Should redeem with each share worth more then 1 underlying", async function () {
                /// ERC4626 rebases shares based on deposited assets and interest
                (0, chai_1.expect)(await r.vault.previewRedeem(getDecimal(addr1Deposit + addr2Deposit))).to.equal(getDecimal(addr1Deposit + addr2Deposit + interestIntoVault));
            });
        });
    });
    describe("Test collecting rebase fees", function () {
        before(async function () {
            await setupAndResetState();
        });
        let transferAmount = 10;
        const rebaseFeeRate = 0.3;
        it("Should transfer fee to treasury on rebase event", async function () {
            const transferAmount = 10;
            await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, hardhat_1.ethers.utils.parseUnits(transferAmount.toString()));
            await r.vault.takeRebaseFees();
            const treasuryBalanceInNatural = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            (0, chai_1.expect)(treasuryBalanceInNatural).to.equal(transferAmount * rebaseFeeRate);
        });
        it("Should have previous assets in vault plus rebase minus fee", async function () {
            const assetsInVaultAfterRebase = getFloatFromBigNum(await r.vault.totalAssets());
            (0, chai_1.expect)(assetsInVaultAfterRebase).to.equal(addr1Deposit + addr2Deposit + (transferAmount - transferAmount * rebaseFeeRate));
        });
        it("Should NOT transfer funds to treasury on a redeem", async function () {
            await r.vault.archimedesRedeem(getDecimal(addr1Deposit / 2), r.addr1.address, sharesOwnerAddress);
            const treasuryBalanceInNatural = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            (0, chai_1.expect)(treasuryBalanceInNatural).to.equal(transferAmount * rebaseFeeRate);
        });
        it("Should transfer fee to treasury on (another) rebase event", async function () {
            transferAmount = 20;
            const treasuryBalanceInNaturalBeforeRebase = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, hardhat_1.ethers.utils.parseUnits(transferAmount.toString()));
            await r.vault.takeRebaseFees();
            const treasuryBalanceInNatural = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            /// expect to have previous fee and current fee and previous fee
            (0, chai_1.expect)(treasuryBalanceInNatural).to.equal(treasuryBalanceInNaturalBeforeRebase + transferAmount * rebaseFeeRate);
        });
    });
});
