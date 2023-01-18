import { NumberBundle } from "./NumberBundle";
import { ERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/ERC20";
import { Contracts } from "./contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
declare class ERC20Utils {
    balance(address: string, token: ERC20): NumberBundle;
    getArchFromTreasury(amount: NumberBundle, toAddress: string, contracts: Contracts): Promise<void>;
    approveAndVerify(spenderAddress: string, approveAmount: NumberBundle, token: ERC20, ownerOfFunds: SignerWithAddress): Promise<void>;
}
export declare const ERC20Utils: ERC20Utils;
export {};
