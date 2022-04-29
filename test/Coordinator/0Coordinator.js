const { expect } = require("chai");
const { ethers } = require("hardhat");
const mainnetHelper = require("../MainnetHelper");
const { ContractTestContext } = require("../ContractTestContext");
const { MAX_UINT256 } = require("@openzeppelin/test-helpers/src/constants");
const ether = require("@openzeppelin/test-helpers/src/ether");

const { leverageTests } = require('./LeverageTests');
const { adminChangesTests } = require('./AdminChangesTests');
const { borrowAndRepayTests } = require('./BorrowAndRepayTests');
const { collateralTests } = require('./CollateralTests');


describe("Coordinator Test suit", function () {
    let r;
    let endUserSigner;
    let leverageEngineSigner;

    before(async function () {
        mainnetHelper.helperResetNetwork(mainnetHelper.defaultBlockNumber);

        r = new ContractTestContext();
        await r.setup();

        endUserSigner = r.addr1;
        leverageEngineSigner = r.owner;

        await mainnetHelper.helperSwapETHWithOUSD(endUserSigner, ethers.utils.parseEther("5.0"));
    });

    it("runs tests suits", async function () {
        adminChangesTests(r);
        leverageTests(r);
        collateralTests(r)
        borrowAndRepayTests(r)
    })
});
