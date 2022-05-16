// We import Chai to use its asserting functions here.
import { expect } from "chai";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("LvUSD contract test suit", function () {
    let r: ContractTestContext;
    const tokenSupply = 1000000;

    beforeEach(async function () {
        r = await buildContractTestContext();
    });

    describe("Minting", function () {
        it("Should be able to mint to specific address", async function () {
            await r.lvUSD.mint(r.owner.address, tokenSupply);
            expect(await r.lvUSD.totalSupply()).to.equal(tokenSupply);
        });
    });

    it("Should transfer tokens to an account", async function () {
        await r.lvUSD.mint(r.owner.address, tokenSupply);
        await r.lvUSD.transfer(r.addr1.address, 50);
        const addr1Balance = await r.lvUSD.balanceOf(r.addr1.address);
        expect(addr1Balance).to.equal(50);
    });

    it("Should transfer tokens between accounts", async function () {
        await r.lvUSD.mint(r.owner.address, tokenSupply);
        await r.lvUSD.transfer(r.addr1.address, 50);
        // Transfer 50 tokens from addr1 to addr2
        // We use .connect(signer) to send a transaction from another account
        await r.lvUSD.connect(r.addr1).transfer(r.addr2.address, 50);
        const addr2Balance = await r.lvUSD.balanceOf(r.addr2.address);
        expect(addr2Balance).to.equal(50);
    });

    it("Transaction should revert if sender doesn’t have enough tokens", async function () {
        // Try to send 1 token from addr1 (0 tokens) to r.owner (1000000 tokens).
        await expect(r.lvUSD.connect(r.addr1).transfer(r.owner.address, 1)).to.be.revertedWith(
            "ERC20: transfer amount exceeds balance",
        );
    });

    it("Balance should remain unchanged if transfer is reverted due to insufficient balance", async function () {
        const initialOwnerBalance = await r.lvUSD.balanceOf(r.owner.address);

        // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
        try {
            await r.lvUSD.connect(r.addr1).transfer(r.owner.address, 1);
        } catch (e) {}

        // Owner balance shouldn't have changed.
        expect(await r.lvUSD.balanceOf(r.owner.address)).to.equal(initialOwnerBalance);
    });

    describe("Should update balances after transfers", async function () {
        let initialOwnerBalance;

        beforeEach(async function () {
            await r.lvUSD.mint(r.owner.address, tokenSupply);
            initialOwnerBalance = await r.lvUSD.balanceOf(r.owner.address);

            // Transfer 100 tokens from owner to addr1.
            await r.lvUSD.transfer(r.addr1.address, 100);

            // Transfer another 50 tokens from owner to addr2.
            await r.lvUSD.transfer(r.addr2.address, 50);
        });

        it("Should have correct balance for owner", async function () {
            // Check balances.
            const finalOwnerBalance = await r.lvUSD.balanceOf(r.owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));
        });

        it("Should have correct balance for first receiver address", async function () {
            // Check balances.
            const addr1Balance = await r.lvUSD.balanceOf(r.addr1.address);
            expect(addr1Balance).to.equal(100);
        });

        it("Should have correct balance for second receiver address", async function () {
            // Check balances.
            const addr2Balance = await r.lvUSD.balanceOf(r.addr2.address);
            expect(addr2Balance).to.equal(50);
        });
    });
});
