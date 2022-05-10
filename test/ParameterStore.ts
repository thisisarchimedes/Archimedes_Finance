import { expect } from "chai";
import { ethers } from "hardhat";
import { helperResetNetwork, defaultBlockNumber } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("ParameterStore test suit", async function () {
    let parameterStore;
    let r: ContractTestContext;

    before(async () => {
        helperResetNetwork(defaultBlockNumber);
        r = await buildContractTestContext();
        parameterStore = r.parameterStore;
    });

    describe("Calculate origination fees", function () {
        it("Should calculate correct fee", async function () {
            const leverageAmount = ethers.utils.parseEther("1000");
            const calculatedFee = await parameterStore.calculateOriginationFee(leverageAmount);
            expect(calculatedFee).to.equal(ethers.utils.parseEther("50"));
        });
        it("Should calculate correct fee with really big numbers", async function () {
            const leverageAmount = ethers.utils.parseEther("10000000000");
            const calculatedFee = await parameterStore.calculateOriginationFee(leverageAmount);
            expect(calculatedFee).to.equal(ethers.utils.parseEther("500000000"));
        });
        it("Should calculate correct fee with small numbers ", async function () {
            const leverageAmount = ethers.utils.parseEther("10");
            const calculatedFee = await parameterStore.calculateOriginationFee(leverageAmount);
            expect(calculatedFee).to.equal(ethers.utils.parseEther("0.5"));
        });
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

    describe("allowed leverage tests", function () {
        describe("Calculate allowed leverage", function () {
            beforeEach(async function () {
                /// values are not being reset on mainnet fork after describe/it so need to reset to default
                await parameterStore.changeGlobalCollateralRate(90);
                await parameterStore.changeMaxNumberOfCycles(10);
            });
            it("Should return zero if no cycles", async function () {
                expect(await parameterStore.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 0)).to.equal(
                    ethers.utils.parseEther("0"),
                );
            });
            it("Should calculate allowed leverage for 2 cycles", async function () {
                expect(await parameterStore.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 2)).to.equal(
                    ethers.utils.parseEther("171"),
                );
            });
            it("Should calculate allowed leverage for 3 cycles", async function () {
                expect(await parameterStore.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 3)).to.equal(
                    ethers.utils.parseEther("243.9"),
                );
            });
            it("Should calculate allowed leverage for 5 cycles", async function () {
                expect(await parameterStore.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 5)).to.equal(
                    ethers.utils.parseEther("368.559"),
                );
            });
            it("Should revert if number of cycles is bigger then allowed max", async function () {
                await expect(
                    parameterStore.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 20),
                ).to.be.revertedWith("Number of cycles must be lower then allowed max");
            });
        });
    });
});
