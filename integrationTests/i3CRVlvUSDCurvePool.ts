// We import Chai to use its asserting functions here.
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { abilvUSD, abilvUSD3CRVPool, abiUSDC, abiZap } from "../test/ABIs";
import { addressZap, address3CRV, addressUSDC, defaultBlockNumber, helperResetNetwork, address3CRVlvUSDPool } from "../test/MainnetHelper";
import { impersonateAccount, fundAccount, stopImpersonate, addresslvUSDToken } from "./IntegrationTestContext";

const About4700 = "0x1000000000000000000";

const addr1 = "0x55fe002aeff02f77364de339a1292923a15844b8"; // Circles address
const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";

let contractlvUSDToken: Contract;
let contractUSDC: Contract;
let contractlvUSD3CRVPool: Contract;
let signerlvUSDAdmin: Signer;
let signerlvUSDMinter: Signer;
let signerAddr1: Signer;

describe("3CRV/lvUSD curve pool test suit", function () {
    before(async function () {
        await helperResetNetwork(defaultBlockNumber);

        // grab lvUSD token contract
        contractlvUSDToken = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

        // grab lvUSD admin address
        signerlvUSDAdmin = await impersonateAccount(addresslvUSDAdmin);
        fundAccount(addresslvUSDAdmin, About4700);

        // grab lvUSD minter address
        signerlvUSDMinter = await impersonateAccount(addresslvUSDMinter);
        fundAccount(addresslvUSDMinter, About4700);

        // grab random test address
        signerAddr1 = await impersonateAccount(addr1);
        fundAccount(addr1, About4700);
    });

    after(async function () {
        await stopImpersonate(addresslvUSDMinter);
        await stopImpersonate(addresslvUSDAdmin);
        await stopImpersonate(addr1);
    });

    it("Add liquidity to 3CRV/lvUSD pool", async function () {
        const tenK18Decimal = ethers.utils.parseUnits("10000", 18);
        const tenK6Decimal = ethers.utils.parseUnits("10000", 6);

        // set lvUSD mint address
        await contractlvUSDToken.connect(signerlvUSDAdmin).setMintDestination(addr1);
        // mint a bit lvUSD
        await contractlvUSDToken.connect(signerlvUSDMinter).mint(tenK18Decimal);

        // grab some USDC - addr1 is Circle's so it has a lot of USDC need to verify though
        contractUSDC = await ethers.getContractAt(abiUSDC, addressUSDC);
        expect(await contractUSDC.balanceOf(addr1)).to.be.gte(tenK6Decimal);

        // approve Zap contract to grab lvUSD and USDC from addr1
        await contractlvUSDToken.connect(signerAddr1).approve(addressZap, tenK18Decimal);
        await contractUSDC.connect(signerAddr1).approve(addressZap, tenK6Decimal);

        // get 3CRV/lvUSD contract
        contractlvUSD3CRVPool = await ethers.getContractAt(abilvUSD3CRVPool, address3CRVlvUSDPool);

        // grab the "before" balances so we can check they increase after adding liquidity
        const balancelvUSD = await contractlvUSD3CRVPool.balances(0);
        const balanceUSDC = await contractlvUSD3CRVPool.balances(1);

        // Seed 3CRV/lvUSD pool via Zap
        // Indexes: 0 = lvusd, 1 = dai, 2 = usdc, 3 = usdt
        // Indexes 123 are the 3curve token
        const zap = await ethers.getContractAt(abiZap, addressZap);
        const coins = [ethers.utils.parseUnits("100", 18), "0x0", ethers.utils.parseUnits("100", 6), "0x0"];
        await zap.connect(signerAddr1).add_liquidity(address3CRVlvUSDPool, coins, 0);

        expect(await contractlvUSD3CRVPool.balances(0)).to.be.gt(balancelvUSD);
        expect(await contractlvUSD3CRVPool.balances(1)).to.be.gt(balanceUSDC);
    });
});
