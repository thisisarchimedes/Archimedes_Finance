"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentUtils = void 0;
const Logger_1 = require("./Logger");
const ValueStore_1 = require("./ValueStore");
class DeploymentUtils {
    async basicSetup(contracts, pools) {
        await this.setDependenciesOnContracts(contracts, pools);
        await this.setUpInitialRoles(contracts);
        await this.setupParamStoreValues(contracts);
    }
    async setupParamStoreValues(contracts) {
        await contracts.parameterStore.changeTreasuryAddress(contracts.signers.treasury.address);
        Logger_1.Logger.log("Finished setting up ParamStore values\n");
    }
    async setUpInitialRoles(contracts) {
        // Here we are setting up initial important roles to allow the system to function
        await contracts.coordinator.setExecutive(contracts.leverageEngine.address);
        await contracts.positionToken.setExecutive(contracts.leverageEngine.address);
        await contracts.exchanger.setExecutive(contracts.coordinator.address);
        await contracts.vault.setExecutive(contracts.coordinator.address);
        await contracts.cdp.setExecutive(contracts.coordinator.address);
        Logger_1.Logger.log("Finished setting up initial roles\n");
    }
    async setDependenciesOnContracts(contracts, pools) {
        await contracts.leverageEngine.setDependencies(contracts.coordinator.address, contracts.positionToken.address, contracts.parameterStore.address, contracts.archToken.address, contracts.externalOUSD.address);
        await contracts.coordinator.setDependencies(contracts.lvUSD.address, contracts.vault.address, contracts.cdp.address, contracts.externalOUSD.address, contracts.exchanger.address, contracts.parameterStore.address, contracts.poolManager.address, contracts.auction.address);
        await contracts.exchanger.setDependencies(contracts.parameterStore.address, contracts.coordinator.address, contracts.lvUSD.address, contracts.externalOUSD.address, contracts.external3CRV.address, pools.curveLvUSDPool.address, ValueStore_1.ValueStore.addressCurveOUSDPool);
        await contracts.vault.setDependencies(contracts.parameterStore.address, contracts.externalOUSD.address);
        // await contracts.parameterStore.changeTreasuryAddress(contracts.treasurySigner.address);
        await contracts.poolManager.setDependencies(contracts.parameterStore.address, contracts.coordinator.address, contracts.lvUSD.address, contracts.external3CRV.address, pools.curveLvUSDPool.address);
        await contracts.parameterStore.setDependencies(contracts.coordinator.address, contracts.exchanger.address, contracts.auction.address);
        await contracts.cdp.setDependencies(contracts.vault.address, contracts.parameterStore.address);
        await contracts.zapper.setDependencies(contracts.leverageEngine.address, contracts.archToken.address, contracts.parameterStore.address);
        Logger_1.Logger.log("Finished setting dependencies on contracts\n");
    }
}
exports.DeploymentUtils = new DeploymentUtils();
