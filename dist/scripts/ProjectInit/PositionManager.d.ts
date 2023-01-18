import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contracts } from "./contracts";
import { LeverageHelper } from "./LeverageHelper";
import { NumberBundle } from "./NumberBundle";
import { Pools } from "./Pools";
export declare class PositionInfo {
    contracts: Contracts;
    positionOwner: SignerWithAddress;
    cycles: number;
    collateral: NumberBundle;
    leverageTaken: NumberBundle;
    archFee: NumberBundle;
    archToLevRatio: NumberBundle;
    positionID: Number;
    cdpBorrowedLvUSD: NumberBundle;
    cdpShares: NumberBundle;
    ousdDepositedInVaultForPosition: NumberBundle;
    fillPostCreationCalled: boolean;
    private constructor();
    static build(contracts: Contracts, owner: SignerWithAddress, collateral: NumberBundle, cycles: number): PositionInfo;
    _fillPositionInfo(): Promise<void>;
    fillPositionPostCreation(positionID: number): Promise<void>;
    getPositionLeverageTaken(): NumberBundle;
    getArchFee(): NumberBundle;
    printPositionInfo(): Promise<void>;
}
export declare class PositionManager {
    contracts: Contracts;
    pools: Pools;
    constructor(contracts: Contracts, pools: Pools);
    createPosition(position: PositionInfo): Promise<void>;
    getOwnerOfPosition(position: PositionInfo): SignerWithAddress;
    approveForPositionCreation(position: PositionInfo): Promise<void>;
    fundSignerForPosition(signer: SignerWithAddress, leverageHelper: LeverageHelper): Promise<void>;
}
