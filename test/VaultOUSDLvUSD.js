const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");

describe("VaultOUSDLvUSD test suit", function () {
    let vaultToken;
    let OUSDMockToken
    let lvUSDToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    const defaultUserOUSDBalance = 1000000;
    const defaultUserLvUSDBalance = 10000; /// Using different value for lvUSD and OUSD to distinguish 

    beforeEach(async function () {
        let contract = await ethers.getContractFactory("VaultOUSDLvUSD");
        let mockOUSDContract = await ethers.getContractFactory("OUSDMockToken");
        let lvUSDContract = await ethers.getContractFactory("LvUSDToken");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        OUSDMockToken = await mockOUSDContract.deploy();
        lvUSDToken = await lvUSDContract.deploy()
        vaultToken = await contract.deploy(OUSDMockToken.address, lvUSDToken.address);

        // Mint initial amount on OUSD token, will be used by all tests/
        // "owner" is calling this mint function. addr1 is our client's address
        await OUSDMockToken.mint(addr1.address, defaultUserOUSDBalance)
        await lvUSDToken.mint(addr1.address, defaultUserLvUSDBalance)
    });

    async function depositOUSDFundsInVault(amount) {
        balance = await vaultToken.getVaultOUSDBalance();
        await depositOUSDFundsInVaultFromAccount(addr1, amount)
        expect(await vaultToken.getVaultOUSDBalance()).to.equal(balance + amount)
    };

    async function depositOUSDFundsInVaultFromAccount(fromAccount, amount) {
        // first set it to 0 to mitigate potential abuse https://ethereum.org/en/developers/tutorials/erc20-annotated-code/
        await OUSDMockToken.connect(fromAccount).approve(vaultToken.address, 0);
        await OUSDMockToken.connect(fromAccount).approve(vaultToken.address, amount);
        // console.log("test:Vault:depositFunds:addr1 allowance %s", await)
        await vaultToken.depositOUSD(fromAccount.address, amount);
    };

    async function checkVaultOUSDBalance(expected) {
        let vaultBalance = await vaultToken.getVaultOUSDBalance();
        expect(vaultBalance).to.equal(expected);
        expect(await OUSDMockToken.balanceOf(vaultToken.address)).to.equal(expected)
    };

    async function depositLvUSDIntoVault(amount) {
        await lvUSDToken.connect(addr1).approve(vaultToken.address, 0);
        await lvUSDToken.connect(addr1).approve(vaultToken.address, amount);
        await vaultToken.depositLvUSD(addr1.address, amount);
    }

    async function checkVaultLvUSDBalance(expected) {
        expect(await lvUSDToken.balanceOf(vaultToken.address)).to.equal(expected)
        expect(await vaultToken.getVaultLvUSDBalance()).to.equal(expected);

    }

    describe("Deposit OUSD funds", function () {
        it("Should be able to deposit OUSD into vault", async function () {
            let depositedAmount = 1000;
            console.log("test:Vault:depositFunds:contract address", vaultToken.address);
            await depositOUSDFundsInVault(depositedAmount)
            await checkVaultOUSDBalance(depositedAmount)
        });

        it("Should revert with transfer amount exceeds balance when trying to transfer more then client owns", async function () {
            // getting current user balance and adding 1 (to exceed balance and fail)
            let depositedAmount = await OUSDMockToken.balanceOf(addr1.address) + 1;

            // store vault balance before trying to deposit
            let vaultBalance = await vaultToken.getVaultOUSDBalance()

            // User tries to deposit more OUSD than they have - should revert
            await expect(depositOUSDFundsInVault(depositedAmount)).to.be.revertedWith("ERC20: transfer amount exceeds balance")

            // we don't expect balance to change, because nothing happened
            await checkVaultOUSDBalance(vaultBalance)
        });

        it("Should be able to deposit OUSD in two different transactions", async function () {
            // mint more OUSD for a different account
            await OUSDMockToken.mint(addr2.address, defaultUserOUSDBalance)

            let vaultBalance = await vaultToken.getVaultOUSDBalance()

            // perform multiple deposits 
            await depositOUSDFundsInVaultFromAccount(addr1, 250);
            await depositOUSDFundsInVaultFromAccount(addr2, 300);
            await depositOUSDFundsInVaultFromAccount(addr1, 250);

            await checkVaultOUSDBalance(vaultBalance + (250 + 250 + 300));
        });

        it("Should not be able to deposit zero OUSD", async function () {
            let vaultBalance = await vaultToken.getVaultOUSDBalance()
            await expect(depositOUSDFundsInVault(0)).to.be.revertedWith("Amount must be greater than zero");
            await checkVaultOUSDBalance(vaultBalance)
        });
    });

    describe("Withdraw OUSD funds", function () {
        beforeEach(async function () {
            // test prep - deposit funds into vault 
            let depositedAmount = 1000
            await depositOUSDFundsInVault(depositedAmount);
            await checkVaultOUSDBalance(depositedAmount);
        });

        it("Should be able to withdraw OUSD from Vault", async function () {
            let amountToWithdraw = 1000;
            let vaultBalance = await vaultToken.getVaultOUSDBalance()
            await vaultToken.withdrawOUSD(addr1.address, amountToWithdraw);
            await checkVaultOUSDBalance(vaultBalance - amountToWithdraw);
        });

        it("should be able to withdraw just some of the funds in the vault", async function () {
            let amountToWithdraw = 400;
            let amountExpectedToStayInVault = 600
            await vaultToken.withdrawOUSD(addr1.address, amountToWithdraw);
            await checkVaultOUSDBalance(amountExpectedToStayInVault);
            /// check that funds where transferred from OUSD contract 
            expect(await OUSDMockToken.balanceOf(addr1.address)).to.equal(defaultUserOUSDBalance
                - amountExpectedToStayInVault)
        });

        it("Should not be able to withdraw zero OUSD", async function () {
            let vaultBalance = await vaultToken.getVaultOUSDBalance()
            await expect(vaultToken.withdrawOUSD(addr1.address,0)).to.be.revertedWith("Amount must be greater than zero");
            await checkVaultOUSDBalance(vaultBalance)
        });
    });

    describe("deposit LvUSD in Vault", async function () {
        it("Should be able to deposit lvUSD into Vault", async function () {
            let amountToDeposit = 1000;
            await depositLvUSDIntoVault(amountToDeposit);
            await checkVaultLvUSDBalance(amountToDeposit);
        });

        it("Should not be able to deposit zero LvUSD", async function () {
            await expect(depositLvUSDIntoVault(0)).to.be.revertedWith("Amount must be greater than zero");
        });
    });

    describe("withdraw lvUSD from Vault", async function () {
        beforeEach(async function () {
            /// first deposit some lvUSD into vault 
            let amountToDeposit = 1000;
            await depositLvUSDIntoVault(amountToDeposit);
            await checkVaultLvUSDBalance(amountToDeposit);
        });

        it("Should be able to withdraw LvUSD from Vault", async function () {
            let amountToWithdraw = 600;
            await vaultToken.withdrawLvUSD(addr1.address, amountToWithdraw);
            await checkVaultLvUSDBalance(400);
        });

        it("Should not be able to withdraw zero LvUSD", async function () {
                let vaultBalance = await vaultToken.getVaultOUSDBalance()
                await expect(vaultToken.withdrawLvUSD(addr1.address,0)).to.be.revertedWith("Amount must be greater than zero");
                await checkVaultOUSDBalance(vaultBalance)
        });
    });

});