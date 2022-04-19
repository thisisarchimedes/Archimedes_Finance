// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");

describe("Arch Token test suit", function () {
    let totalSupply;
    let contract;
    let token;
    let owner;
    let user1;
    let user2;
    let users;

    beforeEach(async function () {
        contract = await ethers.getContractFactory("ArchToken");
        [owner, user1, user2, ...users] = await ethers.getSigners();
        token = await contract.deploy();
        totalSupply = await token.totalSupply();
    });

    describe("Pre-Mint", function () {
        it("Should have pre-mint totalSupply of 100m", async function () {
            // convert from BigNumber to readable value
            totalSupply = ethers.utils.formatUnits(totalSupply, "ether");
            // formatUnits() returns a number with the tenths place included
            expect(totalSupply).to.eq("100000000.0");
        });
    });

    // basic end-to-end testing of underlying erc20
    describe("Transactions", function () {
        it("Should not be able to transfer() more than total supply", async function () {
            let amount = totalSupply + 1;
            await expect(
                token.transfer(user1.address, amount)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("Should be able to transfer() tokens between accounts", async function () {
            let amount = ethers.utils.parseUnits("1");
            await token.transfer(user1.address, amount);
            expect(await token.balanceOf(user1.address)).to.eq(amount);
        });

        it("transfer() should fail if sender doesn't have enough tokens", async function () {
            let amount1 = ethers.utils.parseUnits("1");
            let amount2 = ethers.utils.parseUnits("2");
            await token.transfer(user2.address, amount1);
            await expect(
                token.connect(user2).transfer(user1.address, amount2)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("Should update balances after transfer()", async function () {
            let amount1 = ethers.utils.parseUnits("1");
            let amount2 = ethers.utils.parseUnits("2");
            const ownerInitialBalance = await token.balanceOf(owner.address);
            await token.transfer(user1.address, amount1);
            await token.transfer(user2.address, amount2);
            expect(await token.balanceOf(user1.address)).to.eq(amount1);
            expect(await token.balanceOf(user2.address)).to.eq(amount2);
            expect(await token.balanceOf(owner.address)).to.eq(
                ownerInitialBalance.sub(amount1).sub(amount2)
            );
        });
    });
});
