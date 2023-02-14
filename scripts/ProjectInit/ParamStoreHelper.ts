import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ParameterStore } from "../../types/contracts/ParameterStore";
import { Contracts } from "./Contracts";
import { ERC20Utils } from "./ERC20Utils";
import { EtherUtils } from "./EtherUtils";
import { LeverageHelper } from "./LeverageHelper";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { Pools } from "./Pools";
import { PositionInfo } from "./PositionInfo";
import { TestConstants } from "./TestConstants";

export class ParamStoreHelper {
    private contracts: Contracts;
    private paramStore: ParameterStore;

    constructor (contracts: Contracts) {
        this.contracts = contracts;
        this.paramStore = contracts.parameterStore;
    }

    async setOriginationFee (fee: NumberBundle) {
        Logger.log("Setting OrinationFee to " + fee.getNum() + "%");
        await this.paramStore.changeOriginationFeeRate(fee.getBn());
    }
}
