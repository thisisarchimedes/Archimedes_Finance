import { helperResetNetwork, helperSwapETHWithOUSD } from "./MainnetHelper";
import { ethers } from "hardhat";
import { expect } from "chai";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

/* Integration tests start here */

let contractARCHToken;

describe("Setting the stage: Getting some OUSD and deploying our contracts", function () {
    let signer;
    let user;
    let r: ContractTestContext;
    let lvUSD;

    before(async function () {
        // Reset network before integration tests
        helperResetNetwork(14533286);
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
    });

    beforeEach(async function () {
        // get signers
        [signer, user] = await ethers.getSigners();
    });

    it("Should do a basic ETH<>OUSD swap", async function () {
        await helperSwapETHWithOUSD(user, ethers.utils.parseEther("3.0"));
    });

    it("Should deploy lvUSD ERC-20 contract", async function () {
        // running simple check - calling decimals to ensure contract was deployed
        expect(await lvUSD.decimals()).to.equal(18);
    });

    it("Should deploy ARCH token ERC-20 contract", async function () {
        // deploying ARCH contract
        // NOTE: we don't have ARCH token contract yet - so we use lvUSD as a mock here.
        // TBD: replace when we implement ARCH
        const factoryARCHToken = await ethers.getContractFactory("LvUSDToken");
        contractARCHToken = await factoryARCHToken.deploy();
        await contractARCHToken.deployed();

        // running simple check - calling decimals to ensure contract was deployed
        expect(await contractARCHToken.decimals()).to.equal(18);
    });
});
