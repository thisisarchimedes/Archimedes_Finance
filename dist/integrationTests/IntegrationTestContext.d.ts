import { Signer } from "ethers";
export declare const addressArchToken = "0xC07C4fED091B3131eAadcBc548e66A45FDD45C65";
export declare const addressTreasury = "0x42208D094776c533Ee96a4a57d50a6Ac04Af4aA2";
export declare const addresslvUSDToken = "0x99899399C097a55afb6b48f797Dc5AcfA7d343B1";
export declare function impersonateAccount(address: string): Promise<Signer>;
export declare function fundAccount(address: string, amount: string): Promise<void>;
export declare function stopImpersonate(address: string): Promise<void>;
