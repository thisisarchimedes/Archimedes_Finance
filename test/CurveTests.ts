import { ethers, network } from "hardhat";
import { expect } from "chai";
import { helperResetNetwork, helperSwapETHWith3CRV } from "./MainnetHelper";
import { createMetapool, getMetapool, fundMetapool, setupMetapool, exchangeLvUSDfor3CRV, exchange3CRVfor3LvUSD } from "./CurveHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

/* Integration tests start here */

let contractARCHToken;

describe("CurveHelper Test Suite", function () {
    let owner;
    let user1;
    let user2;
    let r: ContractTestContext;
    let lvUSD;
    let token3CRV;

    before(async function () {
        // Reset network before integration tests
        helperResetNetwork(14533286);
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
        token3CRV = r.external3CRV;
        // get signers
        [owner, user1, user2] = await ethers.getSigners();
        // Mint 10 ETH of LvUSD
        await lvUSD.mint(owner.address, ethers.utils.parseEther("10.0"));
        // Mint 10 ETH of 3CRV
        await helperSwapETHWith3CRV(owner, ethers.utils.parseEther("10.0"));
        console.log(
            "owner balances: %s lvusd, %s 3crv",
            ethers.utils.formatUnits(await lvUSD.balanceOf(owner.address)),
            ethers.utils.formatUnits(await token3CRV.balanceOf(owner.address)),
        );
    });

    beforeEach(async function () {});

    it("Should create a 3CRV+LvUSD metapool", async function () {
        let poolAddress = ethers.constants.AddressZero;
        poolAddress = await createMetapool(lvUSD, owner);
        expect(poolAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should get values of a Metapool", async function () {
        const pool = await getMetapool(await createMetapool(lvUSD, owner), owner);
        expect(await pool.A()).to.eq(1337);
    });

    it("Should fund a Metapool", async function () {
        const addressPool = await createMetapool(lvUSD, owner);
        // (addressPool, [amountToken1, amountToken2], owner)
        await fundMetapool(addressPool, [ethers.utils.parseEther("8.0"), ethers.utils.parseEther("7.0")], owner, r);
        expect(await lvUSD.balanceOf(addressPool)).to.eq(ethers.utils.parseEther("8.0"));
        expect(await token3CRV.balanceOf(addressPool)).to.eq(ethers.utils.parseEther("7.0"));
    });

    it("Should setup (create and fund) a Metapool", async function () {});

    it("Should exchange X for Y", async function () {});

    it("Should exchange Y for X", async function () {});
});
