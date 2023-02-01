"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopImpersonate = exports.fundAccount = exports.impersonateAccount = exports.addresslvUSDToken = exports.addressTreasury = exports.addressArchToken = void 0;
const hardhat_1 = __importStar(require("hardhat"));
exports.addressArchToken = "0xC07C4fED091B3131eAadcBc548e66A45FDD45C65";
exports.addressTreasury = "0x42208D094776c533Ee96a4a57d50a6Ac04Af4aA2";
exports.addresslvUSDToken = "0x99899399C097a55afb6b48f797Dc5AcfA7d343B1";
async function impersonateAccount(address) {
    // grabing treasury access (treasury is already on mainnet, need to grab it on the fork)
    await hardhat_1.default.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return await hardhat_1.ethers.getSigner(address);
}
exports.impersonateAccount = impersonateAccount;
async function fundAccount(address, amount) {
    // adding some ETH so we can initiate tx
    await hardhat_1.default.network.provider.send("hardhat_setBalance", [
        address,
        amount,
    ]);
}
exports.fundAccount = fundAccount;
async function stopImpersonate(address) {
    await hardhat_1.default.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [address],
    });
}
exports.stopImpersonate = stopImpersonate;
