const { ethers } = require('hardhat');
const { expect } = require('chai');
const helper = require('./MainnetHelper');

describe('Checking test suit state before running unit tests', function () {
    let signer;

    beforeEach(async function () {
        // get signers
        [signer] = await ethers.getSigners();
    });

    it('Ensure mainnet fork is running', async function () {
        // loading USDT contract
        const usdtToken = new ethers.Contract(helper.addressUSDT, helper.abiUSDTToken, signer);
        expect(usdtToken.address).to.equal(helper.addressUSDT);

        // check decimals (USDT has 6 decimals)
        const decimals = await usdtToken.decimals();
        expect(decimals).to.equal(6);
    });
});
