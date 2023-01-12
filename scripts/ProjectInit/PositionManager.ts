import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contracts } from "./contracts";
import { ERC20Utils } from "./ERC20Utils";
import { LeverageHelper } from "./LeverageHelper";
import { Logger } from "./Logger";
import { NumberBundle } from "./NumberBundle";
import { Pools } from "./Pools";
import { TestConstants } from "./TestConstants";
import { ValueStore } from "./ValueStore";

export class PositionManager {
    contracts: Contracts;
    pools: Pools

    constructor(contracts: Contracts, pools: Pools) {
        this.contracts = contracts;
        this.pools = pools;
    }

    /// Fund the user with any tokens they might need to create positions 
    async fundSignerForPosition(signer: SignerWithAddress, leverageHelper: LeverageHelper) {
        await this.pools.exchangeEthForExactStable(TestConstants.ONE_THOUSAND_USDT.getBn(), signer.address, this.contracts.externalUSDT.address);
        await this.pools.exchangeExactEthForOUSD(TestConstants.ONE_ETH.getBn(), signer.address);
        await ERC20Utils.getArchFromTreasury(TestConstants.ONE_HUNDRED_ETH, signer.address, this.contracts);
        const usdtBalance = await ERC20Utils.balance(signer.address, this.contracts.externalUSDT);
        const archBalance = await ERC20Utils.balance(signer.address, this.contracts.archToken);
        const ousdBalance = await ERC20Utils.balance(signer.address, this.contracts.externalOUSD);
        Logger.log("Signer %s has been funded with %s USDT and %s Arch and %s OUSD",
            signer.address,
            usdtBalance.getNum(),
            archBalance.getNum(),
            ousdBalance.getNum()
        );
    }
}