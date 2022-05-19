import { helperResetNetwork, helperSwapETHWithOUSD } from "./MainnetHelper";
import { ethers } from "hardhat";
import { expect } from "chai";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("Integration tests: Setting the stage: Getting some OUSD and deploying our contracts", function () {
    let r: ContractTestContext;
    let lvUSD;

    before(async function () {
        // Reset network before integration tests
        await helperResetNetwork(14533286);
        // Setup & deploy contracts
        r = await buildContractTestContext();
        lvUSD = r.lvUSD;
    });

    it("Should do a basic ETH<>OUSD swap", async function () {
        await helperSwapETHWithOUSD(r.addr1, ethers.utils.parseEther("3.0"));
    });

    it("Should deploy lvUSD ERC-20 contract", async function () {
        // running simple check - calling decimals to ensure contract was deployed
        expect(await lvUSD.decimals()).to.equal(18);
    });

    it("Should deploy ARCH token ERC-20 contract", async function () {
        // running simple check - calling decimals to ensure contract was deployed
        expect(await r.lvUSD.decimals()).to.equal(18);
    });
});
