const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");

describe("Exchanger Test suit", function () {
    let r;
    let exchanger;
    let balanceLvUSD;
    let balanceOUSD;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);

        r = new ContractTestContext();
        await r.setup();

        // Object under test
        exchanger = r.exchanger;

        // Setup a Curve Meta Pool
        // pool = mainnetHelper.
        // Get indexes of underlying coins to use for exchanges
        // Factory.get_underlying_coins(pool: address)
    });

    this.beforeEach(async function () {
        const LvUSDFactory = await ethers.getContractFactory("LvUSDToken");
        [owner, user1, user2, ...users] = await ethers.getSigners();
        LvUSD = await LvUSDFactory.deploy();
        await LvUSD.mint(owner.address, 1000);
    });

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            await exchanger.xLvUSDforOUSD(100, owner.address);
            expect(await LvUSD.balanceOf(owner.address)).to.eq(900);
        });
        it("Should swap OUSD for LvUSD", async function () {
            // @param: amount OUSD
            // @param: minAmount returned LVUSD
            // await exchanger.xOUSDforLvUSD(100, 90);
            // expect(await LvUSD.balanceOf(owner.address)).to.eq(0);
        });
    });
});
