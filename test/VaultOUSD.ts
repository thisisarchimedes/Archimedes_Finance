import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import {
    helperResetNetwork,
    addressOUSD,
    helperSwapETHWithOUSD,
    defaultBlockNumber,
} from "./MainnetHelper";

const getDecimal = (naturalNumber) => {
    return ethers.utils.parseUnits(naturalNumber.toString());
};

const getFloatFromBigNum = (bigNumValue) => {
    return parseFloat(ethers.utils.formatEther(bigNumValue));
};

describe("VaultOUSD test suit", function () {
    let r: ContractTestContext;
    let sharesOwnerAddress;

    const addr1Deposit = 10;
    const addr2Deposit = 20;
    const interestIntoVault = 10;

    async function setupAndResetState () {
        await helperResetNetwork(defaultBlockNumber);
        r = await buildContractTestContext();

        // Mint initial amount on OUSD token, will be used by all tests
        await helperSwapETHWithOUSD(r.addr1, ethers.utils.parseEther("1.0"));
        await helperSwapETHWithOUSD(r.addr2, ethers.utils.parseEther("1.0"));
        await helperSwapETHWithOUSD(r.addr3, ethers.utils.parseUnits("2.0"));
        await helperSwapETHWithOUSD(r.owner, ethers.utils.parseEther("1.0"));
        sharesOwnerAddress = r.owner.address;

        // deposit OUSD as a user (that gets shares) into vault. Shares goes to owner, not user.
        await r.externalOUSD.connect(r.addr1).approve(r.vault.address, getDecimal(addr1Deposit));
        await r.vault.connect(r.addr1).archimedesDeposit(getDecimal(addr1Deposit), sharesOwnerAddress);
        await r.externalOUSD.connect(r.addr2).approve(r.vault.address, getDecimal(addr2Deposit));
        await r.vault.connect(r.addr2).archimedesDeposit(getDecimal(addr2Deposit), sharesOwnerAddress);
    }

    describe("Addr1 and addr2 signer deposited OUSD into vault", function () {
        before(async function () {
            await setupAndResetState();
        });

        it("Should return OUSD to be Vault's asset", async function () {
            const vaultAsset = await r.vault.asset();
            expect(vaultAsset).to.equal(addressOUSD);
        });

        it("Should have an updated total assets sum after deposit", async function () {
            expect(await r.vault.totalAssets()).to.equal(getDecimal(addr1Deposit + addr2Deposit));
        });

        it("Should have all shares under owners address", async function () {
            expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(getDecimal(addr1Deposit + addr2Deposit));
        });

        describe("Adding more money to vault as interest (ie no shares are minted)", function () {
            before(async function () {
                // increase Vaults balance without minting more shares
                await r.externalOUSD.transfer(r.vault.address, getDecimal(interestIntoVault));
                expect(await r.externalOUSD.balanceOf(r.vault.address)).to.equal(
                    getDecimal(addr1Deposit + addr2Deposit + interestIntoVault),
                );
            });

            it("Should show interest plus deposited in total assets", async function () {
                expect(await r.vault.totalAssets()).to.equal(
                    getDecimal(addr1Deposit + addr2Deposit + interestIntoVault),
                );
            });

            it("Should not change number of shares per deposit", async function () {
                /// Check the max number of share owner has
                expect(await r.vault.maxRedeem(sharesOwnerAddress)).to.equal(
                    getDecimal(addr1Deposit + addr2Deposit),
                );
            });

            it("Should redeem with each share worth more then 1 underlying", async function () {
                /// ERC4626 rebases shares based on deposited assets and interest
                expect(await r.vault.previewRedeem(getDecimal(addr1Deposit + addr2Deposit))).to.equal(
                    getDecimal(addr1Deposit + addr2Deposit + interestIntoVault),
                );
            });
        });
    });

    describe("Test collecting rebase fees", function () {
        before(async function () {
            await setupAndResetState();
        });

        it("Should transfer fee to treasury on rebase event", async function () {
            await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, ethers.utils.parseUnits("10.0"));
            await r.vault.takeRebaseFees();
            const treasuryBalanceInNatural = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            expect(treasuryBalanceInNatural).to.equal(1);
        });
        it("Should have previous assets in vault plus rebase minus fee", async function () {
            const assetsInVaultAfterRebase = getFloatFromBigNum(await r.vault.totalAssets());
            expect(assetsInVaultAfterRebase).to.equal(addr1Deposit + addr2Deposit + 9);
        });
        it("Should NOT transfer funds to treasury on a redeem", async function () {
            await r.vault.archimedesRedeem(getDecimal(addr1Deposit / 2), r.addr1.address, sharesOwnerAddress);
            const treasuryBalanceInNatural = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            expect(treasuryBalanceInNatural).to.equal(1);
        });
        it("Should transfer fee to treasury on (another) rebase event", async function () {
            await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, ethers.utils.parseUnits("20.0"));
            await r.vault.takeRebaseFees();
            const treasuryBalanceInNatural = getFloatFromBigNum(await r.externalOUSD.balanceOf(r.treasurySigner.address));
            /// expect to have previous fee and current fee and previous fee
            expect(treasuryBalanceInNatural).to.equal(3);
        });
    });
});
