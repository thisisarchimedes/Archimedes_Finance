"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERC20Utils = void 0;
const hardhat_1 = require("hardhat");
const NumberBundle_1 = require("./NumberBundle");
class ERC20Utils {
    async balance(address, token) {
        const balance = NumberBundle_1.NumberBundle.withBn(await token.balanceOf(address), hardhat_1.ethers.utils.formatUnits(await token.decimals(), 0));
        return balance;
    }
    async getArchFromTreasury(amount, toAddress, contracts) {
        await contracts.archToken.connect(contracts.signers.treasury).transfer(toAddress, amount.getBn());
    }
    async approveAndVerify(spenderAddress, approveAmount, token, ownerOfFunds) {
        await token.connect(ownerOfFunds).approve(spenderAddress, approveAmount.getBn());
        const currentAllowance = await token.allowance(ownerOfFunds.address, spenderAddress);
        if (currentAllowance.eq(approveAmount.getBn()) == false) {
            throw new Error("Allowance not set correctly. Expected approval: " + approveAmount.getBn() + " Actual: " + currentAllowance);
        }
    }
}
exports.ERC20Utils = new ERC20Utils();
