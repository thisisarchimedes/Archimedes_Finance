import { expect } from "chai";
import { ethers } from "hardhat";
import { helperResetNetwork, defaultBlockNumber } from "./MainnetHelper";
import { ContractTestContext } from "./ContractTestContext";

describe("ParameterStore test suit", async function () {
    let parameterStore;
    let r;

    before(async () => {
        helperResetNetwork(defaultBlockNumber);
        r = new ContractTestContext();
        await r.setup();
        parameterStore = r.parameterStore;
    });

    describe("Treasury address tests", function () {
        it("should have updated treasury address", async function () {
            const newTreasurySigner = ethers.Wallet.createRandom();
            await parameterStore.changeTreasuryAddress(newTreasurySigner.address);
            const returnedTreasuryAddress = await parameterStore.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address);
        });
    });

    describe("Origination fee tests", function () {
        // Note : when we have access control, check that only admin can change it
        // 0.01 equals to 1%
        it("Should have default origination fee value", async function () {
            const originationFeeDefaultValue = ethers.utils.parseEther("0.05");
            const defaultOriginationFeeRate = await parameterStore.getOriginationFeeRate();
            expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue);
        });

        const newOriginationFeeRate = ethers.utils.parseEther("0.01");
        it("should have updated origination fee", async function () {
            await parameterStore.changeOriginationFeeRate(newOriginationFeeRate);
            const returnedOriginationFee = await parameterStore.getOriginationFeeRate();
            expect(returnedOriginationFee).to.equal(newOriginationFeeRate);
        });
    });

    describe("Get and update leverage related values", function () {
        it("Should have default value for globalCollateralRate", async function () {
            expect(await parameterStore.getGlobalCollateralRate()).to.equal(90);
        });

        it("Should have default value for maxNumberOfCycles", async function () {
            expect(await parameterStore.getMaxNumberOfCycles()).to.equal(10);
        });

        it("Should update globalCollateralRate", async function () {
            await parameterStore.changeGlobalCollateralRate(80);
            expect(await parameterStore.getGlobalCollateralRate()).to.equal(80);
        });

        it("Should revert if new globalCollateralRate is higher then 100", async function () {
            await expect(parameterStore.changeGlobalCollateralRate(120)).to.revertedWith(
                "globalCollateralRate must be a number between 1 and 100",
            );
        });

        it("Should update maxNumberOfCycles", async function () {
            await parameterStore.changeMaxNumberOfCycles(12);
            expect(await parameterStore.getMaxNumberOfCycles()).to.equal(12);
        });
    });
});
