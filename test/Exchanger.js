const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("./MainnetHelper");
const { ContractTestContext } = require("./ContractTestContext");
const { MAX_UINT256 } = require("@openzeppelin/test-helpers/src/constants");
const ether = require("@openzeppelin/test-helpers/src/ether");

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
    });

    this.beforeEach(async function () {
        let LvUSDFactory = await ethers.getContractFactory("LvUSDToken");
        [owner, user1, user2, ...users] = await ethers.getSigners();
        LvUSD = await LvUSDFactory.deploy();
        await LvUSD.mint(owner.address, 1000);
    });

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            // await exchanger.xLvUSDforOUSD(100);
            // expect(balanceLvUSD).to.eq(900);
        });
        it("Should swap OUSD for LvUSD", async function () {
            // @param: amount OUSD
            // @param: minAmount returned LVUSD
            // await exchanger.xOUSDforLvUSD(100, 90);
            // expect(balanceOUSD).to.eq(0);
        });
    });
});
