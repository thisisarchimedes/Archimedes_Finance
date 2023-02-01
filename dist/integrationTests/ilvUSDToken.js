"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// We import Chai to use its asserting functions here.
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ABIs_1 = require("../test/ABIs");
const MainnetHelper_1 = require("../test/MainnetHelper");
const IntegrationTestContext_1 = require("./IntegrationTestContext");
const About4700 = "0x1000000000000000000";
const addr1 = "0x6d84F413fc541E6c8693e910af824fF22FFA0166";
const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";
let contractlvUSDToken;
let signerlvUSDAdmin;
let signerlvUSDMinter;
let signerAddr1;
describe("lvUSD test suit", function () {
    before(async function () {
        await (0, MainnetHelper_1.helperResetNetwork)(MainnetHelper_1.defaultBlockNumber);
        // grab lvUSD token contract
        contractlvUSDToken = await hardhat_1.ethers.getContractAt(ABIs_1.abilvUSD, IntegrationTestContext_1.addresslvUSDToken);
        // grab lvUSD admin address
        signerlvUSDAdmin = await (0, IntegrationTestContext_1.impersonateAccount)(addresslvUSDAdmin);
        (0, IntegrationTestContext_1.fundAccount)(addresslvUSDAdmin, About4700);
        // grab lvUSD minter address
        signerlvUSDMinter = await (0, IntegrationTestContext_1.impersonateAccount)(addresslvUSDMinter);
        (0, IntegrationTestContext_1.fundAccount)(addresslvUSDMinter, About4700);
        // grab random test address
        signerAddr1 = await (0, IntegrationTestContext_1.impersonateAccount)(addr1);
        (0, IntegrationTestContext_1.fundAccount)(addr1, About4700);
    });
    after(async function () {
        await (0, IntegrationTestContext_1.stopImpersonate)(addresslvUSDMinter);
        await (0, IntegrationTestContext_1.stopImpersonate)(addresslvUSDAdmin);
        await (0, IntegrationTestContext_1.stopImpersonate)(addr1);
    });
    it("non ADMIN role cannot set mint destination", async function () {
        await (0, chai_1.expect)(contractlvUSDToken.connect(signerAddr1).setMintDestination(addr1))
            .to.be.revertedWith("Caller is not an Admin");
    });
    it("but ADMIN role CAN set mint destination", async function () {
        (0, chai_1.expect)(await contractlvUSDToken.connect(signerlvUSDAdmin).setMintDestination(addr1));
    });
    it("non MINTER role cannot mint lvUSD", async function () {
        await (0, chai_1.expect)(contractlvUSDToken.connect(signerAddr1).mint(0x100))
            .to.be.revertedWith("Caller is not Minter");
    });
    it("but... MINTER role CAN mint lvUSD", async function () {
        (0, chai_1.expect)(await contractlvUSDToken.connect(signerlvUSDMinter).mint(0x100));
        const addr1Balance = await contractlvUSDToken.balanceOf(addr1);
        (0, chai_1.expect)(addr1Balance).to.eq(0x100);
    });
});
