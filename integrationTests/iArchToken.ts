// We import Chai to use its asserting functions here.
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { abiArchToken } from "../test/ABIs";
import { defaultBlockNumber, helperResetNetwork } from "../test/MainnetHelper";
import { addressArchToken, addressTreasury, impersonateAccount, fundAccount, stopImpersonate } from "./IntegrationTestContext";

const expectedTotalSupply = ethers.utils.parseUnits("100000000");

const addr1 = "0x6d84F413fc541E6c8693e910af824fF22FFA0166";
const addr2 = "0x5dD0DcBdcb6D5f9bc58f5bbbF083b417B48C818D";

let contractArchToken: Contract;
let signerTreasury: Signer;
let signerAddr1: Signer;
let signerAddr2: Signer;

describe("Arch Token test suit", function () {
    before(async function () {
        await helperResetNetwork(defaultBlockNumber);

        // grab ArchToken contract and signer
        contractArchToken = await ethers.getContractAt(abiArchToken, addressArchToken);

        // grab Treasury signer (Treasury is EOA)
        signerTreasury = await impersonateAccount(addressTreasury);
        fundAccount(addressTreasury);

        // grab random test address
        signerAddr1 = await impersonateAccount(addr1);
        fundAccount(addr1);

        // grab random test address
        signerAddr2 = await impersonateAccount(addr2);
        fundAccount(addr2);
    });

    after(async function () {
        await stopImpersonate(addressTreasury);
        await stopImpersonate(addressArchToken);
        await stopImpersonate(addr1);
        await stopImpersonate(addr2);
    });

    describe("Pre-Mint", function () {
        it("Should have pre-mint totalSupply of 100m", async function () {
            const totalSupply = await contractArchToken.totalSupply();
            expect(totalSupply).to.eq(expectedTotalSupply);
        });
    });

    describe("Transactions", function () {
        describe("transfer()", function () {
            it("Treasury should have and can transfer all ARCH supply to addr1", async function () {
                const totalSupply = await contractArchToken.totalSupply();

                // send all treasury to addr
                await contractArchToken.connect(signerTreasury).transfer(addr1, totalSupply);
                const addr1Balance = await contractArchToken.balanceOf(addr1);
                expect(addr1Balance).to.eq(totalSupply);
            });

            it("Addr1 now send it back", async function () {
                const totalSupply = await contractArchToken.totalSupply();

                // send it back
                await contractArchToken.connect(signerAddr1).transfer(addressTreasury, totalSupply);
                const treasuryBalance = await contractArchToken.balanceOf(addressTreasury);
                expect(treasuryBalance).to.eq(totalSupply);
                expect(await contractArchToken.balanceOf(addr1)).to.eq(0);
            });

            it("unautherized address (addr2) shouldn't be able to initiate ARCH transfer", async function () {
                const totalSupply = await contractArchToken.totalSupply();

                await expect(contractArchToken.connect(signerAddr2).transferFrom(addressTreasury, addr2, totalSupply))
                    .to.be.revertedWith("ERC20: insufficient allowance");
            });

            it("unless Treasury (the owner of ARCH) call approve for addr2 first", async function () {
                const totalSupply = await contractArchToken.totalSupply();

                await contractArchToken.connect(signerTreasury).approve(addr2, totalSupply);
                expect(await contractArchToken.connect(signerAddr2).transferFrom(addressTreasury, addr2, totalSupply));
            });
        });
    });
});
