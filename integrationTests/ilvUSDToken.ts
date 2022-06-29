// We import Chai to use its asserting functions here.
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { abilvUSD } from "../test/ABIs";
import { defaultBlockNumber, helperResetNetwork } from "../test/MainnetHelper";
import { impersonateAccount, fundAccount, stopImpersonate, addresslvUSDToken } from "./IntegrationTestContext";

const About4700 = "0x1000000000000000000";

const addr1 = "0x6d84F413fc541E6c8693e910af824fF22FFA0166";
const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";

let contractlvUSDToken: Contract;
let signerlvUSDAdmin: Signer;
let signerlvUSDMinter: Signer;
let signerAddr1: Signer;

describe("lvUSD test suit", function () {
    before(async function () {
        await helperResetNetwork(defaultBlockNumber);

        // grab lvUSD token contract
        contractlvUSDToken = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

        // grab lvUSD admin address
        signerlvUSDAdmin = await impersonateAccount(addresslvUSDAdmin);
        fundAccount(addresslvUSDAdmin, About4700);

        // grab lvUSD minter address
        signerlvUSDMinter = await impersonateAccount(addresslvUSDMinter);
        fundAccount(addresslvUSDMinter, About4700);

        // grab random test address
        signerAddr1 = await impersonateAccount(addr1);
        fundAccount(addr1, About4700);
    });

    after(async function () {
        await stopImpersonate(addresslvUSDMinter);
        await stopImpersonate(addresslvUSDAdmin);
        await stopImpersonate(addr1);
    });

    it("non ADMIN role cannot set mint destination", async function () {
        await expect(contractlvUSDToken.connect(signerAddr1).setMintDestination(addr1))
            .to.be.revertedWith("Caller is not an Admin");
    });

    it("but ADMIN role CAN set mint destination", async function () {
        expect(await contractlvUSDToken.connect(signerlvUSDAdmin).setMintDestination(addr1));
    });

    it("non MINTER role cannot mint lvUSD", async function () {
        await expect(contractlvUSDToken.connect(signerAddr1).mint(0x100))
            .to.be.revertedWith("Caller is not Minter");
    });

    it("but... MINTER role CAN mint lvUSD", async function () {
        expect(await contractlvUSDToken.connect(signerlvUSDMinter).mint(0x100));
        const addr1Balance = await contractlvUSDToken.balanceOf(addr1);
        expect(addr1Balance).to.eq(0x100);
    });
});
