import { Contracts } from "./Contracts";
import { ERC20Utils } from "./ERC20Utils";
import { NumberBundle } from "./NumberBundle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

class GeneralStateUtils {
    coordinatorLvUSDBalance: NumberBundle;
    coordinatorOUSDBalance: NumberBundle;
    coordinatorArchBalance: NumberBundle;
    leverageEngineLvUSDBalance: NumberBundle;
    leverageEngineOUSDBalance: NumberBundle;
    leverageEngineArchBalance: NumberBundle;
    exchangerLvUSDBalance: NumberBundle;
    exchangerOUSDBalance: NumberBundle;
    exchangerArchBalance: NumberBundle;
    async syncState (contracts: Contracts) {
        this.coordinatorLvUSDBalance = await ERC20Utils.balance(contracts.coordinator.address, contracts.lvUSD);
        this.coordinatorOUSDBalance = await ERC20Utils.balance(contracts.coordinator.address, contracts.externalOUSD);
        this.coordinatorArchBalance = await ERC20Utils.balance(contracts.coordinator.address, contracts.archToken);

        this.leverageEngineLvUSDBalance = await ERC20Utils.balance(contracts.leverageEngine.address, contracts.lvUSD);
        this.leverageEngineOUSDBalance = await ERC20Utils.balance(contracts.leverageEngine.address, contracts.externalOUSD);
        this.leverageEngineArchBalance = await ERC20Utils.balance(contracts.leverageEngine.address, contracts.archToken);

        this.exchangerLvUSDBalance = await ERC20Utils.balance(contracts.exchanger.address, contracts.lvUSD);
        this.exchangerOUSDBalance = await ERC20Utils.balance(contracts.exchanger.address, contracts.externalOUSD);
        this.exchangerArchBalance = await ERC20Utils.balance(contracts.exchanger.address, contracts.archToken);
    }

    async printUserBalances (contracts: Contracts, user: SignerWithAddress, prefix = "") {
        console.log("--------------------");

        if (prefix !== "") {
            console.log(prefix);
        }
        console.log("UserBalances: lvUSD: %s OUSD: %s ARCH: %s",
            (await ERC20Utils.balance(user.address, contracts.lvUSD)).getNum(),
            (await ERC20Utils.balance(user.address, contracts.externalOUSD)).getNum(),
            (await ERC20Utils.balance(user.address, contracts.archToken)).getNum(),
        );
        console.log("--------------------");
    }

    async printArchimedesBalances (contracts: Contracts, prefix = "") {
        await this.syncState(contracts);
        console.log("--------------------");
        if (prefix !== "") {
            console.log(prefix);
        }

        console.log("CoordinatorBalances: lvUSD: %s OUSD: %s ARCH: %s",
            this.coordinatorLvUSDBalance.getNum(),
            this.coordinatorOUSDBalance.getNum(),
            this.coordinatorArchBalance.getNum(),
        );
        console.log("LeverageEngineBalances: lvUSD: %s OUSD: %s ARCH: %s",
            this.leverageEngineLvUSDBalance.getNum(),
            this.leverageEngineOUSDBalance.getNum(),
            this.leverageEngineArchBalance.getNum(),
        );
        console.log("ExchangerBalances: lvUSD: %s OUSD: %s ARCH: %s",
            this.exchangerLvUSDBalance.getNum(),
            this.exchangerOUSDBalance.getNum(),
            this.exchangerArchBalance.getNum(),
        );
        console.log("--------------------");
    }
}

export const GeneralStateUtils = new GeneralStateUtils();
