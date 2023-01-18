"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const ContractTestContext_1 = require("./ContractTestContext");
describe("ParameterStore test suit", async function () {
    let parameterStore;
    let r;
    before(async () => {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        parameterStore = r.parameterStore;
    });
    describe("Calculate origination fees", function () {
        it("Should calculate correct fee", async function () {
            const leverageAmount = hardhat_1.ethers.utils.parseUnits("1000");
            const calculatedFee = await parameterStore.calculateOriginationFee(leverageAmount);
            /// Origination fee is 0.5% so 1000 lev * 0.005 = 5
            (0, chai_1.expect)(calculatedFee).to.equal(hardhat_1.ethers.utils.parseUnits("5"));
        });
        it("Should calculate correct fee with really big numbers", async function () {
            const leverageAmount = hardhat_1.ethers.utils.parseUnits("10000000000");
            const calculatedFee = await parameterStore.calculateOriginationFee(leverageAmount);
            /// Origination fee is 0.5% so 10000000000 lev * 0.005 = 5
            (0, chai_1.expect)(calculatedFee).to.equal(hardhat_1.ethers.utils.parseUnits("50000000"));
        });
        it("Should calculate correct fee with small numbers ", async function () {
            const leverageAmount = hardhat_1.ethers.utils.parseUnits("10");
            const calculatedFee = await parameterStore.calculateOriginationFee(leverageAmount);
            /// Origination fee is 0.5% so 10 lev * 0.005 =0.05
            (0, chai_1.expect)(calculatedFee).to.equal(hardhat_1.ethers.utils.parseUnits("0.05"));
        });
    });
    describe("Rebase fee rate tests", function () {
        it("Should have default rebase rate fee", async function () {
            const rebaseRate = await parameterStore.getRebaseFeeRate();
            (0, chai_1.expect)(rebaseRate).to.equal(hardhat_1.ethers.utils.parseUnits("0.3"));
        });
        it("Should be able to change default value", async function () {
            const newRebaseRateValue = hardhat_1.ethers.utils.parseUnits("0.5");
            await parameterStore.changeRebaseFeeRate(newRebaseRateValue);
            (0, chai_1.expect)(await parameterStore.getRebaseFeeRate()).to.equal(newRebaseRateValue);
        });
    });
    describe("Emit events tests", function () {
        it("Should emit event on fee rate change", async function () {
            const oldRebaseRateValue = await parameterStore.getRebaseFeeRate();
            const newRebaseRateValue = hardhat_1.ethers.utils.parseUnits("0.3");
            const promise = parameterStore.changeRebaseFeeRate(newRebaseRateValue);
            await (0, chai_1.expect)(promise)
                .to.emit(parameterStore, "ParameterChange")
                .withArgs("rebaseFeeRate", newRebaseRateValue.toString(), oldRebaseRateValue.toString());
        });
        it("Should emit event on treasury address change", async function () {
            const newTreasurySigner = hardhat_1.ethers.Wallet.createRandom();
            const promise = parameterStore.changeTreasuryAddress(newTreasurySigner.address);
            await (0, chai_1.expect)(promise).to.emit(parameterStore, "TreasuryChange").withArgs(newTreasurySigner.address, r.treasurySigner.address);
        });
    });
    describe("Treasury address tests", function () {
        it("Should not be able to change to address zero", async function () {
            const promise = parameterStore.changeTreasuryAddress(hardhat_1.ethers.constants.AddressZero);
            await (0, chai_1.expect)(promise).to.revertedWith("Treasury can't be set to 0");
        });
        it("should have updated treasury address", async function () {
            const newTreasurySigner = hardhat_1.ethers.Wallet.createRandom();
            await parameterStore.changeTreasuryAddress(newTreasurySigner.address);
            const returnedTreasuryAddress = await parameterStore.getTreasuryAddress();
            (0, chai_1.expect)(returnedTreasuryAddress).to.equal(newTreasurySigner.address);
        });
    });
    describe("Curve Guard Percentage tests", function () {
        it("should be able to change curve guard percentage", async function () {
            const oldCGP = await parameterStore.getCurveGuardPercentage();
            const newCGP = oldCGP.add(2);
            await parameterStore.changeCurveGuardPercentage(newCGP);
            const CGP = await parameterStore.getCurveGuardPercentage();
            (0, chai_1.expect)(CGP).to.equal(newCGP);
        });
        it("Should revert if new curve guard percentage is out of range", async function () {
            await (0, chai_1.expect)(parameterStore.changeCurveGuardPercentage(79)).to.revertedWith("New CGP out of range");
            await (0, chai_1.expect)(parameterStore.changeCurveGuardPercentage(101)).to.revertedWith("New CGP out of range");
        });
    });
    describe("Slippage tests", function () {
        it("should be able to change slippage", async function () {
            const oldSlippage = await parameterStore.getSlippage();
            const newSlippage = oldSlippage.add(1);
            await parameterStore.changeSlippage(newSlippage);
            const slippage = await parameterStore.getSlippage();
            (0, chai_1.expect)(slippage).to.equal(newSlippage);
        });
        it("Should revert if new slippage is out of range", async function () {
            await (0, chai_1.expect)(parameterStore.changeSlippage(5)).to.revertedWith("New slippage out of range");
        });
    });
    describe("Origination fee tests", function () {
        // Note : when we have access control, check that only admin can change it
        // 0.005 equals to 0.5%
        it("Should have default origination fee value", async function () {
            const originationFeeDefaultValue = hardhat_1.ethers.utils.parseUnits("0.005");
            const defaultOriginationFeeRate = await parameterStore.getOriginationFeeRate();
            (0, chai_1.expect)(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue);
        });
        const newOriginationFeeRate = hardhat_1.ethers.utils.parseUnits("0.01");
        it("should have updated origination fee", async function () {
            await parameterStore.changeOriginationFeeRate(newOriginationFeeRate);
            const returnedOriginationFee = await parameterStore.getOriginationFeeRate();
            (0, chai_1.expect)(returnedOriginationFee).to.equal(newOriginationFeeRate);
        });
    });
    describe("Get and update leverage related values", function () {
        it("Should have default value for globalCollateralRate", async function () {
            (0, chai_1.expect)(await parameterStore.getGlobalCollateralRate()).to.equal(95);
        });
        it("Should have default value for maxNumberOfCycles", async function () {
            (0, chai_1.expect)(await parameterStore.getMaxNumberOfCycles()).to.equal(10);
        });
        it("Should update globalCollateralRate", async function () {
            await parameterStore.changeGlobalCollateralRate(80);
            (0, chai_1.expect)(await parameterStore.getGlobalCollateralRate()).to.equal(80);
        });
        it("Should revert if new globalCollateralRate is higher then 100", async function () {
            await (0, chai_1.expect)(parameterStore.changeGlobalCollateralRate(120)).to.revertedWith("New collateral rate out of range");
        });
        it("Should update maxNumberOfCycles", async function () {
            await parameterStore.changeMaxNumberOfCycles(12);
            (0, chai_1.expect)(await parameterStore.getMaxNumberOfCycles()).to.equal(12);
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
                (0, chai_1.expect)(await parameterStore.getAllowedLeverageForPosition(hardhat_1.ethers.utils.parseUnits("100"), 0)).to.equal(hardhat_1.ethers.utils.parseUnits("0"));
            });
            it("Should calculate allowed leverage for 2 cycles", async function () {
                (0, chai_1.expect)(await parameterStore.getAllowedLeverageForPosition(hardhat_1.ethers.utils.parseUnits("100"), 2)).to.equal(hardhat_1.ethers.utils.parseUnits("171"));
            });
            it("Should calculate allowed leverage for 3 cycles", async function () {
                (0, chai_1.expect)(await parameterStore.getAllowedLeverageForPosition(hardhat_1.ethers.utils.parseUnits("100"), 3)).to.equal(hardhat_1.ethers.utils.parseUnits("243.9"));
            });
            it("Should calculate allowed leverage for 5 cycles", async function () {
                (0, chai_1.expect)(await parameterStore.getAllowedLeverageForPosition(hardhat_1.ethers.utils.parseUnits("100"), 5)).to.equal(hardhat_1.ethers.utils.parseUnits("368.559"));
            });
            it("Should revert if not enough ArchToken given for position", async function () {
                const leverageAllowedPromise = parameterStore.getAllowedLeverageForPositionWithArch(hardhat_1.ethers.utils.parseUnits("100"), 5, hardhat_1.ethers.utils.parseUnits("0.01"));
                await (0, chai_1.expect)(leverageAllowedPromise).to.revertedWith("Not enough Arch for Pos");
            });
            it("Should return leverage allowance if enough arch token is given", async function () {
                const leverageAllowed = await parameterStore.getAllowedLeverageForPositionWithArch(hardhat_1.ethers.utils.parseUnits("100"), 5, hardhat_1.ethers.utils.parseUnits("1000"));
                (0, chai_1.expect)(leverageAllowed).to.equal(hardhat_1.ethers.utils.parseUnits("368.559"));
            });
            it("Should revert if number of cycles is bigger then allowed max", async function () {
                await (0, chai_1.expect)(parameterStore.getAllowedLeverageForPosition(hardhat_1.ethers.utils.parseUnits("100"), 20)).to.be.revertedWith("Cycles greater than max allowed");
            });
        });
    });
});
describe("ParameterStore Access Control tests", async function () {
    let parameterStore;
    let r;
    before(async () => {
        r = await (0, ContractTestContext_1.buildContractTestContext)();
        parameterStore = r.parameterStore;
        parameterStore.setGovernor(r.addr1.address);
    });
    it("Should not be able to change governor if not admin", async function () {
        const changePromise = parameterStore.connect(r.addr2).setGovernor(r.addr3.address);
        await (0, chai_1.expect)(changePromise).to.be.revertedWith("Caller is not Admin");
    });
    it("owner should not be able to change paramaters (owner is not governor at this point)", async function () {
        const changePromise = parameterStore.changeCurveGuardPercentage(hardhat_1.ethers.utils.parseUnits("50"));
        await (0, chai_1.expect)(changePromise).to.be.revertedWith("Caller is not Governor");
    });
    it("Should be able to change default value as Governor only", async function () {
        const newRebaseRateValue = hardhat_1.ethers.utils.parseUnits("0.9");
        await parameterStore.connect(r.addr1).changeRebaseFeeRate(newRebaseRateValue);
        (0, chai_1.expect)(await parameterStore.getRebaseFeeRate()).to.equal(newRebaseRateValue);
    });
    it("Should not be able to call init again", async function () {
        // does not matter what paramater we pass to init
        const promise = parameterStore.initialize();
        await (0, chai_1.expect)(promise).to.be.revertedWith("Initializable: contract is already initialized");
    });
});
