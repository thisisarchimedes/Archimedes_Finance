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


  it("Owner can mint", async function () {

    let mint_amount = 100;

    lvToken.mint(owner.address, mint_amount);

    expect(await lvToken.totalSupply()).to.equal(mint_amount);
    expect(await lvToken.balanceOf(owner.address)).to.equal(mint_amount);

  });

  it("Non owner cannot mint", async function () {

    let mint_amount = 200;
    
    await expect(lvToken.connect(addr1).mint(owner.address, mint_amount)).to.be.revertedWith('Ownable: caller is not the owner');

  });


});
