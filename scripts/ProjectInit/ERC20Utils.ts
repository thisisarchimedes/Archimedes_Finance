import { Contract } from "ethers";
import { ethers } from "hardhat";
import { NumberBundle } from "./NumberBundle";
import { ERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/ERC20";
import { Signers } from "./Signers";
import { Contracts } from "./Contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

class ERC20Utils {
    async balance(address: string, token: ERC20): NumberBundle {
        const balance = NumberBundle.withBn(
            await token.balanceOf(address),
            await token.decimals()
        )
        return balance;
    }

    async getArchFromTreasury(amount: NumberBundle, toAddress: string, contracts: Contracts) {
        await contracts.archToken.connect(contracts.signers.treasury).transfer(toAddress, amount.getBn());
    }

    async approveAndVerify(spenderAddress: string, approveAmount: NumberBundle, token: ERC20, ownerOfFunds: SignerWithAddress) {
        await token.connect(ownerOfFunds).approve(spenderAddress, approveAmount.getBn());
        const currentAllowance = await token.allowance(ownerOfFunds.address, spenderAddress);
        if (currentAllowance.eq(approveAmount.getBn()) == false) {
            throw new Error("Allowance not set correctly. Expected approval: " + approveAmount.getBn() + " Actual: " + currentAllowance);
        }
    }

    async decimals(token: ERC20): NumberBundle {
        return NumberBundle.withNum(await token.decimals(), 0);
    }
}

export const ERC20Utils = new ERC20Utils();