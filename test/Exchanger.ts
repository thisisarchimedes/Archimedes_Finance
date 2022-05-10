import { helperResetNetwork, helperSwapETHWithOUSD, helperSwapETHWith3CRV, createCurveMetapool3CRV, defaultBlockNumber, addressUSDT } from "./MainnetHelper";
import { expect } from "chai";
import { ethers } from "hardhat";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("Exchanger Test suit", function () {
    let exchanger;
    let owner;
    let user1;
    let user2;

    let r: ContractTestContext;

    before(async function () {
        helperResetNetwork(defaultBlockNumber);

        r = await buildContractTestContext();

        // Object under test
        exchanger = r.exchanger;

        [owner, user1, user2] = await ethers.getSigners();

        // Mint some LvUSD to owner
        await r.lvUSD.mint(owner.address, ethers.utils.parseEther("1000"));
        console.log("Minted 1000 LvUSD");
        await printBalances(owner.address, r);

        // Exchange 2 ETH to 3CRV
        const balance3CRV = await helperSwapETHWith3CRV(owner, ethers.utils.parseEther("4"));
        console.log("Swapped 2 ETH => ~" + parseFloat(ethers.utils.formatUnits(balance3CRV, 18)).toFixed(2) + " 3CRV");
        await printBalances(owner.address, r);

        const addressMetapool = await createCurveMetapool3CRV(r.lvUSD, owner);
    });

    async function printBalances (address, r) {
        const _eth = await ethers.provider.getBalance(address);
        const _lvusd = await r.lvUSD.balanceOf(address);
        const _ousd = await r.externalOUSD.balanceOf(address);
        const _usdt = await r.externalUSDT.balanceOf(address);
        const _3crv = await r.external3CRV.balanceOf(address);
        console.log(
            ">>> ether:" +
                parseInt(ethers.utils.formatEther(_eth)).toFixed(1) +
                " lvusd:" +
                parseInt(ethers.utils.formatUnits(_lvusd, 18)).toFixed(1) +
                " ousd:" +
                parseInt(ethers.utils.formatUnits(_ousd, 18)).toFixed(1) +
                " usdt:" +
                parseInt(ethers.utils.formatUnits(_usdt, 6)).toFixed(1) +
                " 3crv:" +
                parseInt(ethers.utils.formatUnits(_3crv, 18)).toFixed(1),
        );
    }

    describe("Exchanges", function () {
        it("Should swap LvUSD for OUSD", async function () {
            // amount, to, minimum required
            /*
            await exchanger.xLvUSDforOUSD(100, owner.address, 0);
            expect(await LvUSD.balanceOf(owner.address)).to.eq(900);
            */
        });
        it("Should swap OUSD for LvUSD", async function () {
            // @param: amount OUSD
            // @param: minAmount returned LVUSD
            // await exchanger.xOUSDforLvUSD(100, 90);
            // amount, to, minimum required
            // expect(await LvUSD.balanceOf(owner.address)).to.eq(0);
        });
    });
});
