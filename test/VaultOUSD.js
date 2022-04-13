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


describe("VaultOUSD test suit", function () {
    let tokenVault;
    let tokenLvUSD;
    let tokenOUSD;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    const defaultUserOUSDBalanceNatural = 1000000
    const defaultUserOUSDBalance = getEighteenDecimal(defaultUserOUSDBalanceNatural);
    const defaultUserLvUSDBalanceNatural = 10000
    const defaultUserLvUSDBalance = getEighteenDecimal(defaultUserLvUSDBalanceNatural); /// Using different value for lvUSD and OUSD to distinguish 

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        tokenOUSD = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
        let contractVault = await ethers.getContractFactory("VaultOUSD");
        let contractLvUSD = await ethers.getContractFactory("LvUSDToken");
        tokenLvUSD = await contractLvUSD.deploy()
        tokenVault
            = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "OUSD");

        // Mint initial amount on OUSD token, will be used by all tests
        // TODO: find a better way to get OUSD 
        await MainnetHelper.helperSwapETHWithOUSD(addr1,ethers.utils.parseEther("100.0"))
        console.log("Owner OUSD balance is: ", await tokenOUSD.balanceOf(addr1.address))
        await tokenLvUSD.mint(addr1.address, defaultUserLvUSDBalance)
    });

    describe("basic test", function () {
        it("Should return OUSD to be Vault's asset", async function () {
            let vaultAsset = await tokenVault.asset()
            expect(vaultAsset).to.equal(helper.addressOUSD)
        })
    })
}); 