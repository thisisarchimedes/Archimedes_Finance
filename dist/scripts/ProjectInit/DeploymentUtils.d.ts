import { Contracts } from "./contracts";
import { Pools } from "./Pools";
declare class DeploymentUtils {
    basicSetup(contracts: Contracts, pools: Pools): void;
    setupParamStoreValues(contracts: Contracts): void;
    setUpInitialRoles(contracts: Contracts): void;
    setDependenciesOnContracts(contracts: Contracts, pools: Pools): void;
}
export declare const DeploymentUtils: DeploymentUtils;
export {};
