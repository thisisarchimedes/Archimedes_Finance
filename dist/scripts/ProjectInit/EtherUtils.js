"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtherUtils = void 0;
const hardhat_1 = require("hardhat");
class EtherUtils {
    async mineBlock() {
        await hardhat_1.ethers.provider.send("evm_mine");
    }
    async mineBlocks(numBlocks) {
        for (let i = 0; i < numBlocks; i++) {
            await hardhat_1.ethers.provider.send("evm_mine");
        }
    }
}
exports.EtherUtils = new EtherUtils();
