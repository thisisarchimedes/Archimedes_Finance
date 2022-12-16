import { Signer } from "ethers";

interface ISignerWithAddress extends Signer {
    address: string;
}

export {
    ISignerWithAddress,
};
