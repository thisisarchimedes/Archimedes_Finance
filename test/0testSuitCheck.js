const { expect } = require("chai");
var helper = require("./MainnetHelper");

describe("Checking test suit state before running unit tests", function () {
    let signer;

    beforeEach(async function () {
        // get signers
        [signer, addr1, addr2, ...addrs] = await ethers.getSigners();
    });

    it("Ensure mainnet fork is running", async function () {
        // loading USDT contract
        const usdtToken = new ethers.Contract(helper.addressUSDT, helper.abiUSDTToken, signer);
        expect(usdtToken.address).to.equal(helper.addressUSDT);

        // check decimals (USDT has 6 decimals)
        let decimals = await usdtToken.decimals();
        expect(decimals).to.equal(6);
    });
});
