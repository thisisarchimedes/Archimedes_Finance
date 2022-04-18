const { expect } = require("chai");

 describe("Coordinator Test suit", function() {
    let tokenVault;
    let tokenLvUSD;

    before(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        tokenVault = new ethers.Contract(helper.addressOUSD, helper.abiOUSDToken, owner)
        let contractVault = await ethers.getContractFactory("VaultOUSD");
        tokenVault
            = await contractVault.deploy(tokenOUSD.address, "VaultOUSD", "OUSD");

    })
    it("Should create Coordinator", async function () {
        
    })
})
