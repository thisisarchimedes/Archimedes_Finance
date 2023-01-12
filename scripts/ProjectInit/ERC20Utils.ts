import { Contract } from "ethers";
import { ethers } from "hardhat";
import { NumberBundle } from "./NumberBundle";
import { ERC20 } from "../../types/@openzeppelin/contracts/token/ERC20/ERC20";
import { Signers } from "./Signers";
import { Contracts } from "./contracts";

class ERC20Utils {
    async balance(address: string, token: ERC20): NumberBundle {
        const balance = NumberBundle.withBn(
            await token.balanceOf(address),
            ethers.utils.formatUnits(await token.decimals(), 0)
        )
        return balance;
    }

    async getArchFromTreasury(amount: NumberBundle, toAddress: string, contracts: Contracts) {
        await contracts.archToken.connect(contracts.signers.treasury).transfer(toAddress, amount.getBn());
    }
}

export const ERC20Utils = new ERC20Utils();