import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export class NumberBundle {
    num: number;
    bigNum: BigNumber;
    decimal: Number;

    static withBn(bigNum: BigNumber, decimal = 18): NumberBundle {
        const bundle = new NumberBundle();
        bundle.bigNum = bigNum;
        bundle.decimal = decimal;
        bundle.num = parseFloat(ethers.utils.formatUnits(bigNum, decimal));
        return bundle;
    }

    static withNum(number: number, decimal = 18): NumberBundle {
        const bundle = new NumberBundle();
        bundle.num = number;
        bundle.decimal = decimal;
        bundle.bigNum = ethers.utils.parseUnits(number.toString(), decimal);
        return bundle;
    }

    getNum(): number {
        return this.num;
    }

    getBn(): BigNumber {
        return this.bigNum;
    }
}