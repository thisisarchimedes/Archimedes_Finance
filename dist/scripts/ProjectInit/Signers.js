"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signers = void 0;
const hardhat_1 = require("hardhat");
class Signers {
    async init() {
        [this.owner, this.treasury, this.c1, this.c2, this.c3, this.dump] = await hardhat_1.ethers.getSigners();
        return this;
    }
}
exports.Signers = Signers;
