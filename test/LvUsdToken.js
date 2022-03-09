const { expect } = require("chai");

describe("LVUSD Token contract", function () {


    let lvTokenContract;
    let lvToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;

  // `beforeEach` will run before each test, re-deploying the contract every
   // time. It receives a callback, which can be async.
   beforeEach(async function () {
     // Get the ContractFactory and Signers here.
     lvTokenContract = await ethers.getContractFactory("LvUsdToken");
     [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

     // To deploy our contract, we just have to call Token.deploy() and await
     // for it to be deployed(), which happens once its transaction has been
     // mined.
     lvToken = await lvTokenContract.deploy();

   });


  it("Initial Deployment shouldn't mint anything", async function () {

    expect(await lvToken.totalSupply()).to.equal(0);
  });


  it("Default Minter can mint", async function () {

    let mint_amount = 100;

    lvToken.mint(owner.address, mint_amount);

    expect(await lvToken.totalSupply()).to.equal(mint_amount);
    expect(await lvToken.balanceOf(owner.address)).to.equal(mint_amount);
  });


  it("Non owner cannot mint", async function () {

    let mint_amount = 200;

    await expect(lvToken.connect(addr1).mint(owner.address, mint_amount)).to.be.revertedWith('Caller is not a minter');

  });

  it("Grant minter role and mint", async function () {

    let mint_amount = 200;

    await expect(lvToken.connect(addr1).mint(owner.address, mint_amount)).to.be.revertedWith('Caller is not a minter');

    // set address 1 as minter
    lvToken.setMinter(addr1.address)

    // revoking previous minter
    lvToken.revokeMinter(owner.address)

    // addr1 should be able to mint
    lvToken.connect(addr1).mint(addr1.address, mint_amount)
    expect(await lvToken.connect(addr1).balanceOf(addr1.address)).to.equal(mint_amount);

    // previous minter cannot mint
    await expect(lvToken.mint(owner.address, mint_amount)).to.be.revertedWith('Caller is not a minter');

  });

  it("Decimal must be 18", async function () {

    expect(await lvToken.decimals()).to.equal(18);


  });

  /*
  1. No one can burn
  2. Approve + transfer tests
  */


});
