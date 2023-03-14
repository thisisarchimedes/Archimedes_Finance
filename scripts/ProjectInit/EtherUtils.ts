import { ethers } from "hardhat";

class EtherUtils {
    async getBlock(): any {
        return (await ethers.provider.getBlock("latest")).number;
    }

    async mineBlock() {
        await ethers.provider.send("evm_mine");
    }

    async mineBlocks(numBlocks: number) {
        for (let i = 0; i < numBlocks; i++) {
            await ethers.provider.send("evm_mine");
        }
    }
}

export const EtherUtils = new EtherUtils();
