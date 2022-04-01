const { expect } = require("chai");
const exp = require("constants");

describe("VaultOUSDLvUSD test suit", function () {
    let vaultToken;
    let ousdToken
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        let contract = await ethers.getContractFactory("VaultOUSDLvUSD");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        vaultToken = await contract.deploy();

    });

});