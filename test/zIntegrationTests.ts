import { helperResetNetwork, helperSwapETHWithOUSD, helperSwapETHwithUSDD, createCurveMetapool3CRV, getMetapool } from "./MainnetHelper";
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

    it("Should do a basic ETH<>USDD swap", async function () {
        await helperSwapETHwithUSDD(user, ethers.utils.parseEther("3.0"));
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

    // Deploy using the Meta-Pool Factory:
    // https://curve.readthedocs.io/factory-deployer.html#metapool-factory-deployer-and-registry
    it("Should deploy lvUSD/3CRV pool with correct A value", async function () {
        const addressPool = await createCurveMetapool3CRV(lvUSD, signer);
        const pool = await getMetapool(addressPool, signer);
        console.log(pool);
        expect(await pool.A()).to.eq(1337);
    });

    // get the gauge and add bonus ARCH tokens:
    // * The main function we are using is: https://curve.readthedocs.io/dao-gauges.html#setting-the-rewards-contract
    // * However, we are using LiquidityGaugeV3 not LiquidityGaugeV2
    //   (LiquidityGaugeV3 carries this LiquidityGaugeV2 functionality, it just that it is documented under v2)
    it("Should add ARCH token as an extra bonus to the deployed lvUSD/3CRV pool", async function () {
        // TBD: looks like we nede to implement a StakingReward contract (that interfaces with Curve),
        // and probalby also a RewardsManager. Based on the example everyone copys:
        // https://github.com/lidofinance/staking-rewards-manager/tree/main/contracts
    });
});
