import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

export class Signers {
    owner: SignerWithAddress;
    treasury: SignerWithAddress;
    c1: SignerWithAddress;
    c2: SignerWithAddress;
    c3: SignerWithAddress;
    dump: SignerWithAddress;

    async init(): Signers {
        [this.owner, this.treasury, this.c1, this.c2, this.c3, this.dump] = await ethers.getSigners();
        return this;
    }

    async initOwnerOnly(): Signers {
        [this.owner] = await ethers.getSigners();
        return this;
    }

    async impersonateOwner(address: string): Signers {
        this.owner = await ethers.getImpersonatedSigner(address);
        return this;
    }
}
