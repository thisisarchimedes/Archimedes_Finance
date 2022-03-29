const { expect } = require("chai");
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

//const ERC20Mock = artifacts.require('ERC20Mock');


describe("Vault OUSDlvUSD contract", function () {


    let vaultContract;
    let vault;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    let mockToken;

  // `beforeEach` will run before each test, re-deploying the contract every
   // time. It receives a callback, which can be async.
   beforeEach(async function () {

     vaultContract = await ethers.getContractFactory("VaultOUsdLvUsd");
     [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

     // To deploy our contract, we just have to call Token.deploy() and await
     // for it to be deployed(), which happens once its transaction has been
     // mined.
     vault = await vaultContract.deploy();

    // this.mockToken = await ERC20Mock.new("mockOUSD", "OUSD", owner.address, 10000000000000);

   });


  it("Initial Deployment", async function () {

  });


})
