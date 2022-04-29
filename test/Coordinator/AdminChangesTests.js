const { expect } = require("chai");
const { ethers } = require("hardhat");

module.exports.adminChangesTests = function(r) {
    const originationFeeDefaultValue = ethers.utils.parseEther("0.05");
    describe("Admin changes for coordinator", function () {
        it("Should have default value for treasury address", async function () {
            let returnedTreasuryAddress = await r.coordinator.getTreasuryAddress();
            expect(returnedTreasuryAddress).to.equal(r.treasurySigner.address);
        });
    
        describe("Change treasury address", function () {
            /// Note : when we have access control, check that only admin can change it
            let newTreasurySigner = ethers.Wallet.createRandom();
            before(async function () {
                await r.coordinator.changeTreasuryAddress(newTreasurySigner.address);
            });
            it("should have updated treasury address", async function () {
                let returnedTreasuryAddress = await r.coordinator.getTreasuryAddress();
                expect(returnedTreasuryAddress).to.equal(newTreasurySigner.address);
            });
        });
    
        it("Should have default origination fee value", async function () {
            let defaultOriginationFeeRate = await r.coordinator.getOriginationFeeRate();
            expect(defaultOriginationFeeRate).to.equal(originationFeeDefaultValue);
        });
    
        describe("Change origination fee", function () {
            // Note : when we have access control, check that only admin can change it
            // 0.01 equals to 1%
            let newOriginationFeeRate = ethers.utils.parseEther("0.01");
            before(async function () {
                await r.coordinator.changeOriginationFeeRate(newOriginationFeeRate);
            });
            it("should have updated treasury address", async function () {
                let returnedOriginationFee = await r.coordinator.getOriginationFeeRate();
                expect(returnedOriginationFee).to.equal(newOriginationFeeRate);
            });
        });
    })
}