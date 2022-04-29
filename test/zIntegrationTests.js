var helper = require("./MainnetHelper");

const { BigNumber, FixedFormat, FixedNumber, formatFixed, parseFixed } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const {
    CURVE_FACTORY_ADDRESS,
    CURVE_FACTORY_ABI,
    CURVE_3POOL_ADDRESS,
    USDT_ADDRESS,
    abiCurveFactory,
} = require("./MainnetHelper");
const { long } = require("webidl-conversions");
const { ContractTestContext } = require("./ContractTestContext");

/* Integration tests start here */

let contractARCHToken;
let contract3CRVlvUSDPool;

describe("Setting the stage: Getting some OUSD and deploying our contracts", function () {
    let signer;
    let user;
    let r;
    let lvUSD;

    before(async function () {
        /// Reset network before integration tests
        helper.helperResetNetwork(14533286);
        // Setup & deploy contracts
        r = new ContractTestContext();
        await r.setup();
        lvUSD = r.lvUSD;
    });

    beforeEach(async function () {
        // get signers
        [signer, user, addr2, ...addrs] = await ethers.getSigners();
    });

    it("Should do a basic ETH<>OUSD swap", async function () {
        await helper.helperSwapETHWithOUSD(user, ethers.utils.parseEther("3.0"));
    });

    it("Should deploy lvUSD ERC-20 contract", async function () {
        // running simple check - calling decimals to ensure contract was deployed
        expect(await lvUSD.decimals()).to.equal(18);
    });

    it("Should deploy ARCH token ERC-20 contract", async function () {
        // deploying ARCH contract
        // NOTE: we don't have ARCH token contract yet - so we use lvUSD as a mock here. TBD: replace when we implement ARCH
        const factoryARCHToken = await ethers.getContractFactory("LvUSDToken");
        contractARCHToken = await factoryARCHToken.deploy();
        await contractARCHToken.deployed();

        // running simple check - calling decimals to ensure contract was deployed
        expect(await contractARCHToken.decimals()).to.equal(18);
    });

    // Deploy using the Meta-Pool Factory: https://curve.readthedocs.io/factory-deployer.html#metapool-factory-deployer-and-registry
    it("Should deploy lvUSD/3CRV pool with correct A value", async function () {
        const pool = await helper.createCurveMetapool3CRV(lvUSD, signer);
        expect(await pool.A()).to.eq(1337);
    });

    // get the gauge and add bonus ARCH tokens:
    // * The main function we are using is: https://curve.readthedocs.io/dao-gauges.html#setting-the-rewards-contract
    // * However, we are using LiquidityGaugeV3 not LiquidityGaugeV2
    //   (LiquidityGaugeV3 carries this LiquidityGaugeV2 functionality, it just that it is documented under v2)
    it("Should add ARCH token as an extra bonus to the deployed lvUSD/3CRV pool", async function () {
        // TBD: looks like we nede to implement a StakingReward contract (that interfaces with Curve),
        //      and probalby also a RewardsManager. Based on the example everyone copys: https://github.com/lidofinance/staking-rewards-manager/tree/main/contracts
    });
});
