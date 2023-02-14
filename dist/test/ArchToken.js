"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// We import Chai to use its asserting functions here.
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ContractTestContext_1 = require("./ContractTestContext");
// TODO create separate test constants file to load in multiple test
const zeroAddress = hardhat_1.ethers.constants.AddressZero;
const maxUint256 = hardhat_1.ethers.constants.MaxUint256;
describe("Arch Token test suit", function () {
    let r;
    let treasuryAddress;
    const amount1 = hardhat_1.ethers.utils.parseUnits("1");
    const amount2 = hardhat_1.ethers.utils.parseUnits("2");
    const expectedTotalSupply = hardhat_1.ethers.utils.parseUnits("100000000");
    beforeEach(async function () {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        const totalSupply = await r.archToken.totalSupply();
        // For unit test, make owner the entity that holds all ArchToken tokens
        r.archToken.connect(r.treasurySigner).transfer(r.owner.address, totalSupply);
        treasuryAddress = r.owner.address;
    });
    describe("Pre-Mint", function () {
        it("Should have pre-mint totalSupply of 100m", async function () {
            const totalSupply = await r.archToken.totalSupply();
            (0, chai_1.expect)(totalSupply).to.eq(expectedTotalSupply);
        });
        it("Should be minted to the correct addressTreasury correct amount", async function () {
            const treasuryBalance = await r.archToken.balanceOf(treasuryAddress);
            (0, chai_1.expect)(treasuryBalance).to.eq(expectedTotalSupply);
        });
    });
    // basic end-to-end testing of underlying erc20
    describe("Transactions", function () {
        describe("transfer()", function () {
            it("Sender can transfer entire balance", async function () {
                const totalSupply = await r.archToken.totalSupply();
                await r.archToken.transfer(r.addr1.address, totalSupply);
                const addr1Balance = await r.archToken.balanceOf(r.addr1.address);
                (0, chai_1.expect)(addr1Balance).to.eq(totalSupply);
            });
            it("Sender can transfer zero tokens", async function () {
                await r.archToken.transfer(r.addr1.address, hardhat_1.ethers.utils.parseUnits("0"));
                const addr1Balance = await r.archToken.balanceOf(r.addr1.address);
                (0, chai_1.expect)(addr1Balance).to.eq(hardhat_1.ethers.utils.parseUnits("0"));
            });
            it("Sender can send to the zero address", async function () {
                await (0, chai_1.expect)(r.archToken.transfer(zeroAddress, amount1)).to.be.revertedWith("transfer to the zero address");
            });
            it("Should NOT be able to transfer() more than total supply", async function () {
                const amount = expectedTotalSupply.add(1);
                await (0, chai_1.expect)(r.archToken.transfer(r.addr1.address, amount)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });
            it("transfer() should fail if sender doesn't have enough tokens", async function () {
                // transfer addr2 1 eth
                await r.archToken.transfer(r.addr2.address, amount1);
                // attempt to transfer 2 eth as addr2
                await (0, chai_1.expect)(r.archToken.connect(r.addr2).transfer(r.addr1.address, amount2)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });
            it("Should update balances after transfer()", async function () {
                const ownerInitialBalance = await r.archToken.balanceOf(r.owner.address);
                // transfer addr1 1 eth
                await r.archToken.transfer(r.addr1.address, amount1);
                // transfer addr2 2 eth
                await r.archToken.transfer(r.addr2.address, amount2);
                (0, chai_1.expect)(await r.archToken.balanceOf(r.addr1.address)).to.eq(amount1);
                (0, chai_1.expect)(await r.archToken.balanceOf(r.addr2.address)).to.eq(amount2);
                (0, chai_1.expect)(await r.archToken.balanceOf(treasuryAddress)).to.eq(ownerInitialBalance.sub(amount1).sub(amount2));
            });
        });
        describe("approve() and transferFrom() and allowance()", function () {
            beforeEach(async function () {
                // transfer 2 eth to addr1
                await r.archToken.transfer(r.addr1.address, amount2);
                // connect as addr1. approve owner to spend 1 eth
                await r.archToken.connect(r.addr1).approve(r.owner.address, amount1);
            });
            it("New approved amount replaces previous one.", async function () {
                // by default, owner is approved to spend just 1 eth of addr1
                // connect as addr1. approve owner to spend 2 eth
                await r.archToken.connect(r.addr1).approve(r.owner.address, amount2);
                (0, chai_1.expect)(
                // allowance(address owner, address spender)
                await r.archToken.allowance(r.addr1.address, r.owner.address)).to.eq(amount2);
            });
            it("Should approve requested amount", async function () {
                // allowance(address owner, address spender)
                const addr1Allowance = await r.archToken.allowance(r.addr1.address, r.owner.address);
                (0, chai_1.expect)(addr1Allowance).to.eq(amount1);
            });
            it("Should revert if spending more than approved amount", async function () {
                await (0, chai_1.expect)(
                // owner only has 1 eth approved to spend of addr1 money so 2 reverts
                r.archToken.transferFrom(r.addr1.address, r.addr2.address, amount2)).to.be.revertedWith("insufficient allowance");
            });
            it("Should revert when transferFrom() to the zeroAddress", async function () {
                await (0, chai_1.expect)(r.archToken.transfer(zeroAddress, amount1)).to.be.revertedWith("transfer to the zero address");
            });
        });
        // To set unlimited, set allowance amount to: maxUint256
        describe("When spender has unlimited allowance", async function () {
            beforeEach(async function () {
                // transfer 2 ethers to addr1
                await r.archToken.transfer(r.addr1.address, amount2);
                // connect as addr1. approve owner to spend "unlimited"
                await r.archToken.connect(r.addr1).approve(r.owner.address, maxUint256);
            });
            it("Should NOT decrease the spender allowance", async function () {
                // transfer 1 eth
                await r.archToken.transferFrom(r.addr1.address, r.addr2.address, amount1);
                // get allowance amount after
                // allowance(address owner, address spender)
                const ownerAllowanceOnAddr1 = await r.archToken.allowance(r.addr1.address, treasuryAddress);
                // should still be "unlimited"
                (0, chai_1.expect)(ownerAllowanceOnAddr1).to.eq(maxUint256);
            });
        });
    });
});
