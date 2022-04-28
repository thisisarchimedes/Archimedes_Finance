// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const exp = require("constants");

describe("LvUSD contract test suit", function () {
    const tokenSupply = 1000000;

    let contract;
    let token;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        contract = await ethers.getContractFactory("LvUSDToken");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        token = await contract.deploy();
    });

    describe("Minting", function () {
        it("Should be able to mint to specific address", async function () {
            await token.mint(owner.address, tokenSupply);
            expect(await token.totalSupply()).to.equal(tokenSupply);
        });
    });

    it("Should transfer tokens to an account", async function () {
        await token.mint(owner.address, tokenSupply);
        await token.transfer(addr1.address, 50);
        const addr1Balance = await token.balanceOf(addr1.address);
        expect(addr1Balance).to.equal(50);
    });

    it("Should transfer tokens between accounts", async function () {
        await token.mint(owner.address, tokenSupply);
        await token.transfer(addr1.address, 50);
        // Transfer 50 tokens from addr1 to addr2
        // We use .connect(signer) to send a transaction from another account
        await token.connect(addr1).transfer(addr2.address, 50);
        const addr2Balance = await token.balanceOf(addr2.address);
        expect(addr2Balance).to.equal(50);
    });

    it("Transaction should revert if sender doesn’t have enough tokens", async function () {
        // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
        await expect(token.connect(addr1).transfer(owner.address, 1)).to.be.revertedWith(
            "ERC20: transfer amount exceeds balance"
        );
    });

    it("Balance should remain unchanged if transfer is reverted due to insufficient balance", async function () {
        const initialOwnerBalance = await token.balanceOf(owner.address);

        // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
        try {
            await token.connect(addr1).transfer(owner.address, 1);
        } catch {}

        // Owner balance shouldn't have changed.
        expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    describe("Should update balances after transfers", async function () {
        let initialOwnerBalance;

        beforeEach(async function () {
            await token.mint(owner.address, tokenSupply);
            initialOwnerBalance = await token.balanceOf(owner.address);

            // Transfer 100 tokens from owner to addr1.
            await token.transfer(addr1.address, 100);

            // Transfer another 50 tokens from owner to addr2.
            await token.transfer(addr2.address, 50);
        });

        it("Should have correct balance for owner", async function () {
            // Check balances.
            const finalOwnerBalance = await token.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));
        });

        it("Should have correct balance for first receiver address", async function () {
            // Check balances.
            const addr1Balance = await token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(100);
        });

        it("Should have correct balance for second receiver address", async function () {
            // Check balances.
            const addr2Balance = await token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });
    });
});
