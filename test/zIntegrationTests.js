var helper = require('./MainnerHelper');

const {BigNumber, FixedFormat, FixedNumber, formatFixed, parseFixed} = require("@ethersproject/bignumber");
const { expect } = require("chai");

/* Integration tests start here */
describe("Checking test suit state before running unit tests", function () {

    let signer;
    let user;

    beforeEach(async function () {
      
        // get signers
        [signer, user, addr2, ...addrs] = await ethers.getSigners();

    });

    it("Basic ETH<>OUSD", async function () {
        
       await helper.helperSwapETHWithOUSD(user, ethers.utils.parseEther("100.0"))
        
    })
  });
