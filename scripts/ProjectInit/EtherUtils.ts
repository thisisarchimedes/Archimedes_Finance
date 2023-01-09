import { ethers } from "hardhat";


class EtherUtils {
    async mineBlock() {
        await ethers.provider.send("evm_mine");
    }
}

export const EtherUtils = new EtherUtils();