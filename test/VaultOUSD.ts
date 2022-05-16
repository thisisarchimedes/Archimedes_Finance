import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import {
    helperResetNetwork,
    addressOUSD,
    helperSwapETHWithOUSD,
} from "./MainnetHelper";

const getDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString());
};

describe("VaultOUSD test suit", function () {
    let r: ContractTestContext;
    let sharesOwnerAddress;

    const addr1Deposit = 10;
    const addr2Deposit = 20;
    const interestIntoVault = 10;
    before(async function () {
        helperResetNetwork(14533286);
        r = await buildContractTestContext();

        // Mint initial amount on OUSD token, will be used by all tests
        await Promise.all([
            helperSwapETHWithOUSD(r.addr1, ethers.utils.parseEther("1.0")),
            helperSwapETHWithOUSD(r.addr2, ethers.utils.parseEther("1.0")),
            helperSwapETHWithOUSD(r.owner, ethers.utils.parseEther("1.0")),
        ]);
        sharesOwnerAddress = r.owner.address;

        // deposit OUSD as a user (that gets shares) into vault. Shares goes to owner, not user.
        await r.externalOUSD.connect(r.addr1).approve(r.vault.address, getDecimal(addr1Deposit));
        await r.vault.connect(r.addr1).deposit(getDecimal(addr1Deposit), sharesOwnerAddress);
        await r.externalOUSD.connect(r.addr2).approve(r.vault.address, getDecimal(addr2Deposit));
        await r.vault.connect(r.addr2).deposit(getDecimal(addr2Deposit), sharesOwnerAddress);
    });

    describe("Addr1 and addr2 signer deposited OUSD into vault", function () {
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
});
