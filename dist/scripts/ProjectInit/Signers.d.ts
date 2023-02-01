import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
export declare class Signers {
    owner: SignerWithAddress;
    treasury: SignerWithAddress;
    c1: SignerWithAddress;
    c2: SignerWithAddress;
    c3: SignerWithAddress;
    dump: SignerWithAddress;
    init(): Signers;
}
