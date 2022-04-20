// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");

// TODO create separate test constants file to load in multiple test
const ZERO_ADDRESS = ethers.constants.AddressZero;
const MAX_UINT256 = ethers.constants.MaxUint256;

// TODO test for increase and decrease allowance functions since they are inherited
// TODO test for burn functionality

describe("Arch Token test suit", function () {
    let totalSupply;
    let contract;
    let token;
    let owner;
    let user1;
    let user2;
    let users;
    let amount1 = ethers.utils.parseUnits("1");
    let amount2 = ethers.utils.parseUnits("2");

    beforeEach(async function () {
        contract = await ethers.getContractFactory("ArchToken");
        [owner, user1, user2, ...users] = await ethers.getSigners();
        treasuryAddress = owner.address;
        token = await contract.deploy(treasuryAddress);
        totalSupply = await token.totalSupply();
    });

    describe("Pre-Mint", function () {
        it("Should have pre-mint totalSupply of 100m", async function () {
            // convert from BigNumber to readable value
            totalSupply = ethers.utils.formatUnits(totalSupply, "ether");
            // formatUnits() returns a number with the tenths place included
            expect(totalSupply).to.eq("100000000.0");
        });
        it("Should be minted to the correct _addressTreasury", async function () {
            let treasury = await token.balanceOf(treasuryAddress);
            expect(totalSupply).to.eq(treasury);
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
                await token.transfer(
                    user1.address,
                    ethers.utils.parseUnits("0")
                );
                let user1Balance = await token.balanceOf(user1.address);
                expect(user1Balance).to.eq(ethers.utils.parseUnits("0"));
            });
            it("Sender can send to the zero address", async function () {
                await expect(
                    token.transfer(ZERO_ADDRESS, amount1)
                ).to.be.revertedWith("transfer to the zero address");
            });

            it("Should NOT be able to transfer() more than total supply", async function () {
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
                // user2 has 1 eth
                await token.transfer(user2.address, amount1);
                // attempt to transfer 2 eth
                await expect(
                    token.connect(user2).transfer(user1.address, amount2)
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            it("Should update balances after transfer()", async function () {
                const ownerInitialBalance = await token.balanceOf(
                    owner.address
                );
                // user1 has 1 eth
                await token.transfer(user1.address, amount1);
                // user2 has 2 eth
                await token.transfer(user2.address, amount2);
                expect(await token.balanceOf(user1.address)).to.eq(amount1);
                expect(await token.balanceOf(user2.address)).to.eq(amount2);
                expect(await token.balanceOf(owner.address)).to.eq(
                    ownerInitialBalance.sub(amount1).sub(amount2)
                );
            });
        });

        describe("approve() and transferFrom()", function () {
            beforeEach(async function () {
                // user1 has 2 eth
                await token.transfer(user1.address, amount2);
                // connect as user1. approve owner to spend 1 eth
                await token.connect(user1).approve(owner.address, amount1);
                // connect back as owner
                await token.connect(owner);
            });

            it("New approved amount replaces previous one.", async function () {
                // by default, owner is approved to spend just 1 eth of user1
                // connect as user1. approve owner to spend 2 eth
                await token.connect(user1).approve(owner.address, amount2);

                expect(
                    await token.allowance(user1.address, owner.address)
                ).to.eq(amount2);
            });

            it("Should approve request amount", async function () {
                // allowance(address owner, address spender)
                let user1Allowance = await token.allowance(
                    user1.address,
                    owner.address
                );
                expect(user1Allowance).to.eq(amount1);
            });
            it("Should revert if approved amount < transfer amount", async function () {
                await expect(
                    // only 1 eth is approved, so 2 reverts
                    token.transferFrom(user1.address, user2.address, amount2)
                ).to.be.revertedWith("insufficient allowance");
            });
            it("Should revert when transferring to the ZERO_ADDRESS", async function () {
                await expect(
                    token.transferFrom(user1.address, ZERO_ADDRESS, amount1)
                ).to.be.revertedWith("transfer to the zero address");
            });
        });
        // To set unlimited, set allowance amount to: MAX_UINT256
        describe("When spender has unlimited allowance", async function () {
            beforeEach(async function () {
                // user1 has 2 eth
                await token.transfer(user1.address, amount2);
                // connect as user1. approve owner to spend "unlimited"
                await token.connect(user1).approve(owner.address, MAX_UINT256);
                // connect back as owner
                await token.connect(owner);
            });

            it("Should NOT decrease the spender allowance", async function () {
                // transfer 1 eth
                await token.transferFrom(user1.address, user2.address, amount1);
                // get allowance amount after
                let user1Allowance = await token.allowance(
                    user1.address,
                    owner.address
                );
                // should still be "unlimited"
                expect(user1Allowance).to.eq(MAX_UINT256);
            });
        });
    });
});
