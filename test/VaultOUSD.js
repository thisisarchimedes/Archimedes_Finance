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

const getEighteenDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString())
}

const parseEther = (NumberString) => {
    return ethers.utils.parseEther(NumberString)
}

describe("VaultOUSD test suit", function () {
    let tokenVault;
    let tokenLvUSD;
    let tokenOUSD;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    const defaultUserLvUSDBalanceNatural = 10000
    const defaultUserLvUSDBalance = getEighteenDecimal(defaultUserLvUSDBalanceNatural); /// Using different value for lvUSD and OUSD to distinguish 

    let addr1Deposit = 10000
    let addr2Deposit = 20000
    let interestIntoVault = 10000
    before(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
        let contractVault = await ethers.getContractFactory("VaultOUSD");
        let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
        tokenLvUSD = await contractLvUSD.deploy()
        tokenVault
            = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "OUSD");

        // Mint initial amount on OUSD token, will be used by all tests
        // TODO: find a better way to get OUSD 
        await MainnetHelper.helperSwapETHWithOUSD(addr1, ethers.utils.parseEther("100.0"))
        await MainnetHelper.helperSwapETHWithOUSD(addr2, ethers.utils.parseEther("200.0"))
        await MainnetHelper.helperSwapETHWithOUSD(owner, ethers.utils.parseEther("300.0"))

        // deposit OUSD as a user (that gets shares) into vault. Shares goes to owner.
        await tokenOUSD.connect(addr1).approve(tokenVault.address, addr1Deposit);
        await tokenVault.connect(addr1).deposit(10000, owner.address)
        await tokenOUSD.connect(addr2).approve(tokenVault.address, addr2Deposit);
        await tokenVault.connect(addr2).deposit(20000, owner.address)

        await tokenLvUSD.mint(addr1.address, defaultUserLvUSDBalance)
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
            expect(await tokenVault.maxRedeem(owner.address)).to.equal(addr1Deposit + addr2Deposit)
        })

        describe("Adding more money to vault not via deposit", function () {
            before(async function () {
                //increase Vaults balance without minting more shares
                await tokenOUSD.connect(addr1).transfer(tokenVault.address, interestIntoVault)
            })

            it("Should show interest plus deposited in total assets", async function () {
                expect(await tokenVault.totalAssets()).to.equal(addr1Deposit + addr2Deposit + interestIntoVault)
            })

            it("Should not change number of shares per deposit", async function () {
                /// Check the max number of share owner has 
                expect(await tokenVault.maxRedeem(owner.address)).to.equal(addr1Deposit + addr2Deposit)
            })

            it("Should redeem with each share worth more then 1 underlying", async function () {
                expect(await tokenVault.previewRedeem(addr1Deposit + addr2Deposit)).to.equal(addr1Deposit + addr2Deposit + interestIntoVault)
            })
        })



        // it("Everything else", async function () {
        // // deposit OUSD by both Addr1 and addr2
        // console.log("Address intial 1 OUSD balance is: ", await tokenOUSD.balanceOf(addr1.address))
        // console.log("Owner OUSD balance is: ", await tokenOUSD.balanceOf(owner.address))
        // // console.log("Max deposit ", await tokenVault.maxDeposit(addr1.address))
        // // console.log("Owner maxDesosit ", await tokenVault.maxDeposit(owner.address))
        // // console.log("vault it self maxDesosit ", await tokenVault.maxDeposit(tokenVault.address))
        // let amount = getEighteenDecimal(1)
        // console.log("Preview deposit %s", await tokenVault.previewDeposit(10))
        // console.log("Preview withdraw %s", await tokenVault.previewWithdraw(10))

        // await tokenOUSD.connect(addr1).approve(tokenVault.address, amount);
        // // await tokenOUSD.approve(addr1.address, amount); // allow a spender to take the vaults money? 

        // // let numberOfShares = await tokenVault.connect(addr1).deposit(amount, tokenVault.address)
        // let numberOfShares = await tokenVault.connect(addr1).deposit(10000, owner.address)
        // console.log("max redeem for addr1 ", await tokenVault.maxRedeem(addr1.address))
        // console.log("total Assets in vault after transfer:", await tokenVault.totalAssets())
        // console.log("Address 1 before interest payment (after transfer): ", await tokenOUSD.balanceOf(addr1.address))

        // // Check how much shares are worth before interest payment
        // console.log("redeem payout before interest:", await tokenVault.previewRedeem(10000))

        // //increase Vaults balance without minting more shares
        // await tokenOUSD.connect(addr1).transfer(tokenVault.address, 20000)

        // // Check how much shares are worth after interest payment
        // console.log("redeem payout AFTER interest:", await tokenVault.previewRedeem(10000))

        // console.log("total Assets in vault after transfer + interest payment:", await tokenVault.totalAssets())

        // // console.log("Number of shares received ", numberOfShares)
        // console.log("Address 1 final OUSD balance is: ", await tokenOUSD.balanceOf(addr1.address))
        // })
    })


})
