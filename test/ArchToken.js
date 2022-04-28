// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");

// TODO create separate test constants file to load in multiple test
const zeroAddress = ethers.constants.AddressZero;
const maxUint256 = ethers.constants.MaxUint256;

describe("Arch Token test suit", function () {
    let token;
    let owner;
    let user1;
    let user2;
    let users;
    let amount1 = ethers.utils.parseUnits("1");
    let amount2 = ethers.utils.parseUnits("2");
    let expectedTotalSupply = ethers.utils.parseUnits("100000000");

    beforeEach(async function () {
        let contract = await ethers.getContractFactory("ArchToken");
        [owner, user1, user2, ...users] = await ethers.getSigners();
        treasuryAddress = owner.address;
        token = await contract.deploy(treasuryAddress);
    });

    describe("Pre-Mint", function () {
        it("Should have pre-mint totalSupply of 100m", async function () {
            totalSupply = await token.totalSupply();

            expect(totalSupply).to.eq(expectedTotalSupply);
        });
        it("Should be minted to the correct _addressTreasury correct amount", async function () {
            let treasuryBalance = await token.balanceOf(treasuryAddress);
            expect(treasuryBalance).to.eq(expectedTotalSupply);
        });
        it("External minting should NOT be available", async function () {
            expect(function () {
                token.mint();
            }).to.throw(TypeError, "not a function");
        });
    });

    // basic end-to-end testing of underlying erc20
    describe("Transactions", function () {
        describe("transfer()", function () {
            it("Sender can transfer entire balance", async function () {
                let ownerBalance = await token.balanceOf(owner.address);
                await token.transfer(user1.address, ownerBalance);
                let user1Balance = await token.balanceOf(user1.address);
                expect(user1Balance).to.eq(totalSupply);
            });
            it("Sender can transfer zero tokens", async function () {
                await token.transfer(user1.address, ethers.utils.parseUnits("0"));
                let user1Balance = await token.balanceOf(user1.address);
                expect(user1Balance).to.eq(ethers.utils.parseUnits("0"));
            });
            it("Sender can send to the zero address", async function () {
                await expect(token.transfer(zeroAddress, amount1)).to.be.revertedWith("transfer to the zero address");
            });

            it("Should NOT be able to transfer() more than total supply", async function () {
                let amount = expectedTotalSupply + 1;
                await expect(token.transfer(user1.address, amount)).to.be.revertedWith(
                    "ERC20: transfer amount exceeds balance"
                );
            });

            it("Should be able to transfer() tokens between accounts", async function () {
                await token.transfer(user1.address, amount1);
                expect(await token.balanceOf(user1.address)).to.eq(amount1);
            });

            it("transfer() should fail if sender doesn't have enough tokens", async function () {
                // transfer user2 1 eth
                await token.transfer(user2.address, amount1);
                // attempt to transfer 2 eth as user2
                await expect(token.connect(user2).transfer(user1.address, amount2)).to.be.revertedWith(
                    "ERC20: transfer amount exceeds balance"
                );
            });

            it("Should update balances after transfer()", async function () {
                const ownerInitialBalance = await token.balanceOf(owner.address);
                // transfer user1 1 eth
                await token.transfer(user1.address, amount1);
                // transfer user2 2 eth
                await token.transfer(user2.address, amount2);
                expect(await token.balanceOf(user1.address)).to.eq(amount1);
                expect(await token.balanceOf(user2.address)).to.eq(amount2);
                expect(await token.balanceOf(owner.address)).to.eq(ownerInitialBalance.sub(amount1).sub(amount2));
            });
        });

        describe("approve() and transferFrom() and allowance()", function () {
            beforeEach(async function () {
                // transfer 2 eth to user1
                await token.transfer(user1.address, amount2);
                // connect as user1. approve owner to spend 1 eth
                await token.connect(user1).approve(owner.address, amount1);
            });

            it("New approved amount replaces previous one.", async function () {
                // by default, owner is approved to spend just 1 eth of user1
                // connect as user1. approve owner to spend 2 eth
                await token.connect(user1).approve(owner.address, amount2);

                expect(
                    // allowance(address owner, address spender)
                    await token.allowance(user1.address, owner.address)
                ).to.eq(amount2);
            });

            it("Should approve requested amount", async function () {
                // allowance(address owner, address spender)
                let user1Allowance = await token.allowance(user1.address, owner.address);
                expect(user1Allowance).to.eq(amount1);
            });

            it("Should revert if spending more than approved amount", async function () {
                await expect(
                    // owner only has 1 eth approved to spend of user1 money so 2 reverts
                    token.transferFrom(user1.address, user2.address, amount2)
                ).to.be.revertedWith("insufficient allowance");
            });

            it("Should revert when transferFrom() to the zeroAddress", async function () {
                await expect(token.transferFrom(user1.address, zeroAddress, amount1)).to.be.revertedWith(
                    "transfer to the zero address"
                );
            });
        });
        // To set unlimited, set allowance amount to: maxUint256
        describe("When spender has unlimited allowance", async function () {
            beforeEach(async function () {
                // transfer 2 ethers to user 1
                await token.transfer(user1.address, amount2);
                // connect as user1. approve owner to spend "unlimited"
                await token.connect(user1).approve(owner.address, maxUint256);
            });

            it("Should NOT decrease the spender allowance", async function () {
                // transfer 1 eth
                await token.transferFrom(user1.address, user2.address, amount1);
                // get allowance amount after
                // allowance(address owner, address spender)
                let ownerAllowanceOnUser1 = await token.allowance(user1.address, owner.address);
                // should still be "unlimited"
                expect(ownerAllowanceOnUser1).to.eq(maxUint256);
            });
        });
    });
});
