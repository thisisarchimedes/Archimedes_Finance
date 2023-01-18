"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// We import Chai to use its asserting functions here.
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ABIs_1 = require("../test/ABIs");
const MainnetHelper_1 = require("../test/MainnetHelper");
const IntegrationTestContext_1 = require("./IntegrationTestContext");
const expectedTotalSupply = hardhat_1.ethers.utils.parseUnits("100000000");
const About4700ETH = "0x1000000000000000000";
const addr1 = "0x6d84F413fc541E6c8693e910af824fF22FFA0166";
const addr2 = "0x5dD0DcBdcb6D5f9bc58f5bbbF083b417B48C818D";
let contractArchToken;
let signerTreasury;
let signerAddr1;
let signerAddr2;
describe("Arch Token test suit", function () {
    before(async function () {
        await (0, MainnetHelper_1.helperResetNetwork)(MainnetHelper_1.defaultBlockNumber);
        // grab ArchToken contract and signer
        contractArchToken = await hardhat_1.ethers.getContractAt(ABIs_1.abiArchToken, IntegrationTestContext_1.addressArchToken);
        // grab Treasury signer (Treasury is EOA)
        signerTreasury = await (0, IntegrationTestContext_1.impersonateAccount)(IntegrationTestContext_1.addressTreasury);
        (0, IntegrationTestContext_1.fundAccount)(IntegrationTestContext_1.addressTreasury, About4700ETH);
        // grab random test address
        signerAddr1 = await (0, IntegrationTestContext_1.impersonateAccount)(addr1);
        (0, IntegrationTestContext_1.fundAccount)(addr1, About4700ETH);
        // grab random test address
        signerAddr2 = await (0, IntegrationTestContext_1.impersonateAccount)(addr2);
        (0, IntegrationTestContext_1.fundAccount)(addr2, About4700ETH);
    });
    after(async function () {
        await (0, IntegrationTestContext_1.stopImpersonate)(IntegrationTestContext_1.addressTreasury);
        await (0, IntegrationTestContext_1.stopImpersonate)(IntegrationTestContext_1.addressArchToken);
        await (0, IntegrationTestContext_1.stopImpersonate)(addr1);
        await (0, IntegrationTestContext_1.stopImpersonate)(addr2);
    });
    describe("Pre-Mint", function () {
        it("Should have pre-mint totalSupply of 100m", async function () {
            const totalSupply = await contractArchToken.totalSupply();
            (0, chai_1.expect)(totalSupply).to.eq(expectedTotalSupply);
        });
    });
    describe("Transactions", function () {
        describe("transfer()", function () {
            it("Treasury should have and can transfer all ARCH supply to addr1", async function () {
                const totalSupply = await contractArchToken.totalSupply();
                // send all treasury to addr
                await contractArchToken.connect(signerTreasury).transfer(addr1, totalSupply);
                const addr1Balance = await contractArchToken.balanceOf(addr1);
                (0, chai_1.expect)(addr1Balance).to.eq(totalSupply);
            });
            it("Addr1 now send it back", async function () {
                const totalSupply = await contractArchToken.totalSupply();
                // send it back
                await contractArchToken.connect(signerAddr1).transfer(IntegrationTestContext_1.addressTreasury, totalSupply);
                const treasuryBalance = await contractArchToken.balanceOf(IntegrationTestContext_1.addressTreasury);
                (0, chai_1.expect)(treasuryBalance).to.eq(totalSupply);
                (0, chai_1.expect)(await contractArchToken.balanceOf(addr1)).to.eq(0);
            });
            it("unautherized address (addr2) shouldn't be able to initiate ARCH transfer", async function () {
                const totalSupply = await contractArchToken.totalSupply();
                await (0, chai_1.expect)(contractArchToken.connect(signerAddr2).transferFrom(IntegrationTestContext_1.addressTreasury, addr2, totalSupply))
                    .to.be.revertedWith("ERC20: insufficient allowance");
            });
            it("unless Treasury (the owner of ARCH) call approve for addr2 first", async function () {
                const totalSupply = await contractArchToken.totalSupply();
                await contractArchToken.connect(signerTreasury).approve(addr2, totalSupply);
                (0, chai_1.expect)(await contractArchToken.connect(signerAddr2).transferFrom(IntegrationTestContext_1.addressTreasury, addr2, totalSupply));
            });
        });
    });
});
