import { expect } from "chai";
import { ethers } from "hardhat";
import {
    helperResetNetwork,
    addressOUSD,
    abiOUSDToken,
    helperSwapETHWithOUSD,
    defaultBlockNumber,
} from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

const getDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString());
};

describe("VaultOUSD test suit", function () {
    let tokenVault;
    let tokenOUSD;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let sharesOwnerAddress;
    let r: ContractTestContext;

    const addr1Deposit = 10;
    const addr2Deposit = 20;
    const interestIntoVault = 10;
    before(async function () {
        helperResetNetwork(defaultBlockNumber);

        r = await buildContractTestContext();
        addr1 = r.addr1.address;
        addr2 = r.addr2.address;
        addr3 = r.addr3.address;
        owner = r.owner.address;
        sharesOwnerAddress = r.owner.address;

        // [owner, addr1, addr2] = await ethers.getSigners();
        // helperResetNetwork(14533286);
        // tokenOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, owner);
        // const contractVault = await ethers.getContractFactory("VaultOUSD");
        // tokenVault = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "VOUSD");

        // Mint initial amount on OUSD token, will be used by all tests
        await helperSwapETHWithOUSD(addr1, ethers.utils.parseEther("1.0"));
        await helperSwapETHWithOUSD(addr2, ethers.utils.parseEther("1.0"));
        await helperSwapETHWithOUSD(addr3, ethers.utils.parseEther("2.0"));
        await helperSwapETHWithOUSD(owner, ethers.utils.parseEther("1.0"));

        // deposit OUSD as a user (that gets shares) into vault. Shares goes to owner, not user.
        await r.externalOUSD.connect(r.addr1).approve(r.vault.address, getDecimal(addr1Deposit));
        await r.vault.connect(r.addr1).archimedesDeposit(getDecimal(addr1Deposit), sharesOwnerAddress);
        await r.externalOUSD.connect(r.addr2).approve(r.vault.address, getDecimal(addr2Deposit));
        await r.vault.connect(addr2).archimedesDeposit(getDecimal(addr2Deposit), sharesOwnerAddress);
    });

    // describe("Addr1 and addr2 signer deposited OUSD into vault", function () {
    //     it("Should return OUSD to be Vault's asset", async function () {
    //         const vaultAsset = await tokenVault.asset();
    //         expect(vaultAsset).to.equal(addressOUSD);
    //     });

    //     it("Should have an updated total assets sum after deposit", async function () {
    //         expect(await tokenVault.totalAssets()).to.equal(getDecimal(addr1Deposit + addr2Deposit));
    //     });

    //     it("Should have all shares under owners address", async function () {
    //         expect(await tokenVault.maxRedeem(sharesOwnerAddress)).to.equal(getDecimal(addr1Deposit + addr2Deposit));
    //     });

    //     describe("Adding more money to vault as interest (ie no shares are minted)", function () {
    //         before(async function () {
    //             // increase Vaults balance without minting more shares
    //             await tokenOUSD.transfer(tokenVault.address, getDecimal(interestIntoVault));
    //             expect(await tokenOUSD.balanceOf(tokenVault.address)).to.equal(
    //                 getDecimal(addr1Deposit + addr2Deposit + interestIntoVault),
    //             );
    //         });

    //         it("Should show interest plus deposited in total assets", async function () {
    //             expect(await tokenVault.totalAssets()).to.equal(
    //                 getDecimal(addr1Deposit + addr2Deposit + interestIntoVault),
    //             );
    //         });

    //         it("Should not change number of shares per deposit", async function () {
    //             /// Check the max number of share owner has
    //             expect(await tokenVault.maxRedeem(sharesOwnerAddress)).to.equal(
    //                 getDecimal(addr1Deposit + addr2Deposit),
    //             );
    //         });

    //         it("Should redeem with each share worth more then 1 underlying", async function () {
    //             /// ERC4626 rebases shares based on deposited assets and interest
    //             expect(await tokenVault.previewRedeem(getDecimal(addr1Deposit + addr2Deposit))).to.equal(
    //                 getDecimal(addr1Deposit + addr2Deposit + interestIntoVault),
    //             );
    //         });
    //     });
    // });
    describe("Test collecting rebase fees", function () {
        it("Should take transfer fee to treasury on rebase event", async function () {
            await r.externalOUSD.connect(r.addr3).approve(r.vault.address, ethers.utils.parseEther("2.0"));
            await r.externalOUSD.connect(r.addr3).transfer(r.vault.address, ethers.utils.parseEther("1.0"));
            await r.vault.takeRebaseFees();
            expect(r.externalOUSD.balanceOf(r.treasurySigner.address)).to.equal(ethers.utils.parseEther("0.1"));
        });
    });
});
