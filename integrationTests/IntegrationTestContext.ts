import hre, { ethers } from "hardhat";
import { Signer } from "ethers";

export const addressArchToken = "0xC07C4fED091B3131eAadcBc548e66A45FDD45C65";
export const addressTreasury = "0x42208D094776c533Ee96a4a57d50a6Ac04Af4aA2";

export async function impersonateAccount (address: string): Promise<Signer> {
    // grabing treasury access (treasury is already on mainnet, need to grab it on the fork)
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });

    return await ethers.getSigner(address);
}

export async function fundAccount (address: string, amount: string) {
    // adding some ETH so we can initiate tx
    await hre.network.provider.send("hardhat_setBalance", [
        address,
        amount,
    ]);
}

export async function stopImpersonate (address: string) {
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [address],
    });
}
