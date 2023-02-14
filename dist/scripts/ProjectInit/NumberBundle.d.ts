import { BigNumber } from "ethers";
export declare class NumberBundle {
    num: number;
    bigNum: BigNumber;
    decimal: Number;
    static withBn(bigNum: BigNumber, decimal?: number): NumberBundle;
    static withNum(number: number, decimal?: number): NumberBundle;
    getNum(): number;
    getBn(): BigNumber;
    setNumber(number: Number): void;
}
