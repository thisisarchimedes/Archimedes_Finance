const { expect } = require("chai");
const { ethers } = require("hardhat");

module.exports.leverageTests = function(r) {
    describe("allowed leverage tests", function () {
        describe("Get and update leverage related values", function () {
            it("Should have default value for globalCollateralRate", async function () {
                expect(await r.coordinator.getGlobalCollateralRate()).to.equal(90);
            });
    
            it("Should have default value for maxNumberOfCycles", async function () {
                expect(await r.coordinator.getMaxNumberOfCycles()).to.equal(10);
            });
    
            it("Should update globalCollateralRate", async function () {
                await r.coordinator.changeGlobalCollateralRate(80);
                expect(await r.coordinator.getGlobalCollateralRate()).to.equal(80);
            });
    
            it("Should revert if new globalCollateralRate is higher then 100", async function () {
                await expect(r.coordinator.changeGlobalCollateralRate(120)).to.revertedWith(
                    "globalCollateralRate must be a number between 1 and 100"
                );
            });
    
            it("Should update maxNumberOfCycles", async function () {
                await r.coordinator.changeMaxNumberOfCycles(12);
                expect(await r.coordinator.getMaxNumberOfCycles()).to.equal(12);
            });
        });
    
        describe("Calculate allowed leverage", function () {
            beforeEach(async function () {
                /// values are not being reset on mainnet fork after describe/it so need to reset to default
                await r.coordinator.changeGlobalCollateralRate(90);
                await r.coordinator.changeMaxNumberOfCycles(10);
            });
            it("Should return zero if no cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 0)).to.equal(
                    ethers.utils.parseEther("0")
                );
            });
            it("Should calculate allowed leverage for 2 cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 2)).to.equal(
                    ethers.utils.parseEther("171")
                );
            });
            it("Should calculate allowed leverage for 3 cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 3)).to.equal(
                    ethers.utils.parseEther("243.9")
                );
            });
            it("Should calculate allowed leverage for 5 cycles", async function () {
                expect(await r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 5)).to.equal(
                    ethers.utils.parseEther("368.559")
                );
            });
            it("Should revert if number of cycles is bigger then allowed max", async function () {
                await expect(
                    r.coordinator.getAllowedLeverageForPosition(ethers.utils.parseEther("100"), 20)
                ).to.be.revertedWith("Number of cycles must be lower then allowed max");
            });
        });
    })
}