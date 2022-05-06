import { Signer } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { addressUSDT, abiUSDTToken } from "./MainnetHelper";

describe("Checking test suit state before running unit tests", function () {
    let signer: Signer;

    beforeEach(async function () {
        // get signers
        [signer] = await ethers.getSigners();
    });

    it("Ensure mainnet fork is running", async function () {
        // loading USDT contract
        const usdtToken = new ethers.Contract(addressUSDT, abiUSDTToken, signer);
        expect(usdtToken.address).to.equal(addressUSDT);

        // check decimals (USDT has 6 decimals)
        const decimals = await usdtToken.decimals();
        expect(decimals).to.equal(6);
    });
});
