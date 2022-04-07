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

const getEighteenDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString())
}

describe("VaultOUSDLvUSD test suit", function () {
    let vault;
    let OUSDMockToken
    let lvUSDToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    const defaultUserOUSDBalanceNatural = 1000000
    const defaultUserOUSDBalance = getEighteenDecimal(defaultUserOUSDBalanceNatural);
    const defaultUserLvUSDBalanceNatural = 10000
    const defaultUserLvUSDBalance = getEighteenDecimal(defaultUserLvUSDBalanceNatural); /// Using different value for lvUSD and OUSD to distinguish 

    beforeEach(async function () {
        let contract = await ethers.getContractFactory("VaultOUSDLvUSD");
        let mockOUSDContract = await ethers.getContractFactory("OUSDMockToken");
        let lvUSDContract = await ethers.getContractFactory("LvUSDToken");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        OUSDMockToken = await mockOUSDContract.deploy();
        lvUSDToken = await lvUSDContract.deploy()
        vault
            = await contract.deploy(OUSDMockToken.address, lvUSDToken.address);

        // Mint initial amount on OUSD token, will be used by all tests/
        // "owner" is calling this mint function. addr1 is our client's address
        await OUSDMockToken.mint(addr1.address, defaultUserOUSDBalance)
        await lvUSDToken.mint(addr1.address, defaultUserLvUSDBalance)
    });

    async function depositOUSDFundsInVault(amount) {
        balance = await vault
            .getVaultOUSDBalance();
        await depositOUSDFundsInVaultFromAccount(addr1, amount)
        expect(await vault
            .getVaultOUSDBalance()).to.equal(balance + amount)
    };

    async function depositOUSDFundsInVaultFromAccount(fromAccount, amount) {
        // first set it to 0 to mitigate potential abuse https://ethereum.org/en/developers/tutorials/erc20-annotated-code/
        await OUSDMockToken.connect(fromAccount).approve(vault
            .address, 0);
        await OUSDMockToken.connect(fromAccount).approve(vault
            .address, amount);
        await vault
            .depositOUSD(fromAccount.address, amount);
    };

    async function checkVaultOUSDBalance(expected) {
        let vaultBalance = await vault
            .getVaultOUSDBalance();
        expect(vaultBalance).to.equal(BigNumber.from(expected));

        // Balance on OUSD contract can be >= to vault stored balance (before rebasing)
        expect(await OUSDMockToken.balanceOf(vault.address)).to.gte(BigNumber.from(expected))
    };

    async function depositLvUSDIntoVault(amount) {
        await lvUSDToken.connect(addr1).approve(vault
            .address, 0);
        await lvUSDToken.connect(addr1).approve(vault
            .address, amount);
        await vault
            .depositLvUSD(addr1.address, amount);
    }

    async function checkVaultLvUSDBalance(expected) {
        expect(await lvUSDToken.balanceOf(vault
            .address)).to.equal(expected)
        expect(await vault
            .getVaultLvUSDBalance()).to.equal(expected);

    }

    // TODO: add test that deposit and withdraw multiple times and from multiple accounts 

    describe("Deposit OUSD funds", function () {
        it("Should be able to deposit OUSD into vault", async function () {
            let depositedAmount = getEighteenDecimal(1000);
            await depositOUSDFundsInVault(depositedAmount)
            await checkVaultOUSDBalance(depositedAmount)
        });

        it("Should revert with transfer amount exceeds balance when trying to transfer more then client owns", async function () {
            // getting current user balance and adding 1 (to exceed balance and fail)
            let depositedAmount = await OUSDMockToken.balanceOf(addr1.address) + 1;

            // store vault balance before trying to deposit
            let vaultOUSDBalance = await vault
                .getVaultOUSDBalance()

            // User tries to deposit more OUSD than they have - should revert
            await expect(depositOUSDFundsInVault(depositedAmount)).to.be.revertedWith("ERC20: transfer amount exceeds balance")

            // we don't expect balance to change, because nothing happened
            await checkVaultOUSDBalance(vaultOUSDBalance)
        });

        it("Should be able to deposit OUSD in two different transactions", async function () {
            // mint more OUSD for a different account
            await OUSDMockToken.mint(addr2.address, defaultUserOUSDBalance)

            let vaultOUSDBalance = await vault
                .getVaultOUSDBalance()

            // perform multiple deposits 
            await depositOUSDFundsInVaultFromAccount(addr1, getEighteenDecimal(250));
            await depositOUSDFundsInVaultFromAccount(addr2, getEighteenDecimal(300));
            await depositOUSDFundsInVaultFromAccount(addr1, getEighteenDecimal(250));

            await checkVaultOUSDBalance(vaultOUSDBalance + getEighteenDecimal(250 + 250 + 300));
        });

        it("Should not be able to deposit zero OUSD", async function () {
            let vaultOUSDBalance = await vault
                .getVaultOUSDBalance()
            await expect(depositOUSDFundsInVault(0)).to.be.revertedWith("Amount must be greater than zero");
            await checkVaultOUSDBalance(vaultOUSDBalance)
        });
    });

    describe("Withdraw OUSD funds", function () {
        beforeEach(async function () {
            // test prep - deposit funds into vault 
            let depositedAmount = getEighteenDecimal(1000)
            await depositOUSDFundsInVault(depositedAmount);
            await checkVaultOUSDBalance(depositedAmount);
        });

        it("Should be able to withdraw OUSD from Vault", async function () {
            let amountToWithdraw = getEighteenDecimal(1000);
            let vaultOUSDBalance = await vault
                .getVaultOUSDBalance()
            await vault
                .withdrawOUSD(addr1.address, amountToWithdraw);
            await checkVaultOUSDBalance(vaultOUSDBalance - amountToWithdraw);
        });

        it("should be able to withdraw just some of the funds in the vault", async function () {
            let amountToWithdraw = getEighteenDecimal(400);
            let amountExpectedToStayInVault = getEighteenDecimal(600)
            await vault
                .withdrawOUSD(addr1.address, amountToWithdraw);
            await checkVaultOUSDBalance(amountExpectedToStayInVault);

            /// check that funds where transferred from OUSD contract 
            let ousdTokenBalance = await OUSDMockToken.balanceOf(addr1.address)
            let expectedOUSDBalance = getEighteenDecimal(999400);
            await expect(ousdTokenBalance).to.equal(expectedOUSDBalance)
        });

        it("Should not be able to withdraw zero OUSD", async function () {
            let vaultOUSDBalance = await vault
                .getVaultOUSDBalance()
            await expect(vault
                .withdrawOUSD(addr1.address, 0)).to.be.revertedWith("Amount must be greater than zero");
            await checkVaultOUSDBalance(vaultOUSDBalance)
        });

        it("Should not be able to withdraw more OUSD then deposited in vault", async function () {
            let amountToWithdraw = BigNumber.from(await vault
                .getVaultOUSDBalance()).add(getEighteenDecimal(100))

            await expect(vault
                .withdrawOUSD(addr1.address, amountToWithdraw)).to.be.revertedWith("Insufficient funds in Vault");
        })
    });

    describe("deposit LvUSD in Vault", async function () {
        it("Should be able to deposit lvUSD into Vault", async function () {
            let amountToDeposit = getEighteenDecimal(1000);
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
            let amountToDeposit = getEighteenDecimal(1000);
            await depositLvUSDIntoVault(amountToDeposit);
            await checkVaultLvUSDBalance(amountToDeposit);
        });

        it("Should be able to withdraw LvUSD from Vault", async function () {
            let amountToWithdraw = getEighteenDecimal(600);
            await vault
                .withdrawLvUSD(addr1.address, amountToWithdraw);
            await checkVaultLvUSDBalance(getEighteenDecimal(400));
        });

        it("Should not be able to withdraw zero LvUSD", async function () {
            let vaultLvUSDBalance = await vault
                .getVaultOUSDBalance()
            await expect(vault
                .withdrawLvUSD(addr1.address, 0)).to.be.revertedWith("Amount must be greater than zero");
            await checkVaultOUSDBalance(vaultLvUSDBalance)
        });

        it("Should not be able to withdraw more lvUSD then deposited in vault", async function () {
            let amountToWithdraw = BigNumber.from(await vault
                .getVaultLvUSDBalance()).add(getEighteenDecimal(100))

            await expect(vault
                .withdrawLvUSD(addr1.address, amountToWithdraw)).to.be.revertedWith("Insufficient funds in Vault");
        })
    });

}); 