"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberBundle = void 0;
const hardhat_1 = require("hardhat");
class NumberBundle {
    static withBn(bigNum, decimal = 18) {
        const bundle = new NumberBundle();
        bundle.bigNum = bigNum;
        bundle.decimal = decimal;
        bundle.num = hardhat_1.ethers.utils.formatUnits(bigNum, decimal);
        return bundle;
    }
    static withNum(number, decimal = 18) {
        const bundle = new NumberBundle();
        bundle.num = number;
        bundle.decimal = decimal;
        bundle.bigNum = hardhat_1.ethers.utils.parseUnits(number.toString(), decimal);
        return bundle;
    }
    getNum() {
        return this.num;
    }
    getBn() {
        return this.bigNum;
    }
    setNumber(number) {
        this.num = number;
        this.bigNum = hardhat_1.ethers.utils.parseUnits(number.toString(), this.decimal);
    }
    setNumber(bigNum) {
        this.bigNum = bigNum;
        this.num = hardhat_1.ethers.utils.formatUnits(bigNum, this.decimal);
    }
}
exports.NumberBundle = NumberBundle;
