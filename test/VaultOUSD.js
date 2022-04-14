const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");
const {
    BigNumber,
    FixedFormat,
    FixedNumber,
    formatFixed,
    parseFixed
} = require("@ethersproject/bignumber");
var helper = require('./MainnetHelper');
const MainnetHelper = require("./MainnetHelper");

describe("VaultOUSD test suit", function () {
    let tokenVault;
    let tokenOUSD;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    let sharesOwnerAddress;

    let addr1Deposit = 10000
    let addr2Deposit = 20000
    let interestIntoVault = 10000
    before(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
        let contractVault = await ethers.getContractFactory("VaultOUSD");
        tokenVault
            = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "OUSD");

        // Mint initial amount on OUSD token, will be used by all tests
        await MainnetHelper.helperSwapETHWithOUSD(addr1, ethers.utils.parseEther("100.0"))
        await MainnetHelper.helperSwapETHWithOUSD(addr2, ethers.utils.parseEther("200.0"))
        await MainnetHelper.helperSwapETHWithOUSD(owner, ethers.utils.parseEther("300.0"))
        sharesOwnerAddress = owner.address
        // deposit OUSD as a user (that gets shares) into vault. Shares goes to owner, not user.
        await tokenOUSD.connect(addr1).approve(tokenVault.address, addr1Deposit);
        await tokenVault.connect(addr1).deposit(addr1Deposit, sharesOwnerAddress)
        await tokenOUSD.connect(addr2).approve(tokenVault.address, addr2Deposit);
        await tokenVault.connect(addr2).deposit(addr2Deposit, sharesOwnerAddress)
    });

    describe("Addr1 and addr2 signer deposited OUSD into vault", function () {
        it("Should return OUSD to be Vault's asset", async function () {
            let vaultAsset = await tokenVault.asset()
            expect(vaultAsset).to.equal(helper.addressOUSD)
        })

        it("Should have an updated total assets sum after deposit", async function () {
            expect(await tokenVault.totalAssets()).to.equal(addr1Deposit + addr2Deposit)
        })

        it("Should have all shares under owners address", async function () {
            expect(await tokenVault.maxRedeem(sharesOwnerAddress)).to.equal(addr1Deposit + addr2Deposit)
        })

        describe("Adding more money to vault as interest (ie no shares are minted)", function () {
            before(async function () {
                //increase Vaults balance without minting more shares
                await tokenOUSD.connect(addr1).transfer(tokenVault.address, interestIntoVault)
            })

            it("Should show interest plus deposited in total assets", async function () {
                expect(await tokenVault.totalAssets()).to.equal(addr1Deposit + addr2Deposit + interestIntoVault)
            })

            it("Should not change number of shares per deposit", async function () {
                /// Check the max number of share owner has 
                expect(await tokenVault.maxRedeem(sharesOwnerAddress)).to.equal(addr1Deposit + addr2Deposit)
            })

            it("Should redeem with each share worth more then 1 underlying", async function () {
                expect(await tokenVault.previewRedeem(addr1Deposit + addr2Deposit)).to.equal(addr1Deposit + addr2Deposit + interestIntoVault)
            })
        })
    })

})
