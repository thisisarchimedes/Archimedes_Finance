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

/* Integration tests start here */

let contractlvUSDToken;
let contractARCHToken;
let contract3CRVlvUSDPool;

describe("Setting the stage: Getting some OUSD and deploying our contracts", function () {
    let signer;
    let user;

    before(async function () {
        /// Reset network before integration tests
        helper.helperResetNetwork(14533286);
    });

    beforeEach(async function () {
        // get signers
        [signer, user, addr2, ...addrs] = await ethers.getSigners();
    });

    it("Should do a basic ETH<>OUSD swap", async function () {
        await helper.helperSwapETHWithOUSD(user, ethers.utils.parseEther("3.0"));
    });

    it("Should deploy lvUSD ERC-20 contract", async function () {
        // deploying lvUSD contract
        const factorylvUSDToken = await ethers.getContractFactory("LvUSDToken");
        contractlvUSDToken = await factorylvUSDToken.deploy();
        await contractlvUSDToken.deployed();

        // running simple check - calling decimals to ensure contract was deployed
        expect(await contractlvUSDToken.decimals()).to.equal(18);
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
    it("Should deploy lvUSD/3CRV pool", async function () {
        const curveFactory = new ethers.Contract(helper.addressCurveFactory, helper.abiCurveFactory, signer);

        // Factory.deploy_metapool(_base_pool: address, _name: String[32], _symbol: String[10], _coin: address, _A: uint256, _fee: uint256) → address: nonpayable
        // https://curve.readthedocs.io/factory-deployer.html#deploying-a-pool
        await curveFactory.deploy_metapool(
            helper.addressCurve3Pool,
            "lvUSD pool",
            "lvUSD",
            contractlvUSDToken.address,
            10,
            4000000
        );

        // now let's see if we can find this pool
        // https://curve.readthedocs.io/factory-deployer.html#Factory.find_pool_for_coins
        // we deployed a 3CRV/lvUSD pool - so we ask Curve Factory to look for pools that can deal with USDT/lvUSD
        contract3CRVlvUSDPool = await curveFactory.find_pool_for_coins(helper.addressUSDT, contractlvUSDToken.address);
        expect(contract3CRVlvUSDPool).to.not.equal(0);
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
