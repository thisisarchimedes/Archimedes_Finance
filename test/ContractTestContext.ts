import { ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { addressOUSD, abiOUSDToken } from "./MainnetHelper";

async function getContractFactories (factoryNames: string[]): Promise<{ [K: string]: ContractFactory }> {
    const contracts = await Promise.all(
        factoryNames.map(factoryName => ethers.getContractFactory(factoryName)),
    );
    return factoryNames.reduce((acc, factoryName, i) => ({
        ...acc,
        [factoryName]: contracts[i],
    }), {});
}

export class ContractTestContext {
    // addresses for different roles
    owner;
    addr1;
    addr2;
    addr3;
    treasurySigner;

    // Archimedes contracts
    coordinator;
    cdp;
    vault;
    lvUSD;
    exchanger;
    leverageEngine;
    leverageAllocator;
    positionToken;
    parameterStore;

    // External contracts
    externalOUSD;

    async setup () {
        [this.owner, this.addr1, this.addr2, this.treasurySigner, this.addr3] = await ethers.getSigners();

        const contracts = await getContractFactories([
            "CDPosition",
            "Exchanger",
            "LeverageEngine",
            "LeverageAllocator",
            "PositionToken",
            "ParameterStore",
            "VaultOUSD",
            "LvUSDToken",
            "Coordinator",
        ]);

        this.externalOUSD = new ethers.Contract(addressOUSD, abiOUSDToken, this.owner);

        [
            this.cdp,
            this.exchanger,
            this.leverageEngine,
            this.leverageAllocator,
            this.positionToken,
            this.parameterStore,
            this.vault,
            this.lvUSD,
        ] = await Promise.all([
            contracts.CDPosition.deploy(),
            contracts.Exchanger.deploy(),
            contracts.LeverageEngine.deploy(this.owner.address),
            contracts.LeverageAllocator.deploy(),
            contracts.PositionToken.deploy(),
            contracts.ParameterStore.deploy(),
            contracts.VaultOUSD.deploy(this.externalOUSD.address, "VaultOUSD", "VOUSD"),
            contracts.LvUSDToken.deploy(),
        ]);

        this.coordinator = await contracts.Coordinator.deploy();

        // Post init contracts
        await Promise.all([
            this.leverageEngine.init(
                this.coordinator.address,
                this.positionToken.address,
                this.parameterStore.address,
                this.leverageAllocator.address,
            ),
            this.exchanger.init(this.lvUSD.address, this.coordinator.address, this.externalOUSD.address),
            this.parameterStore.init(this.treasurySigner.address),
            this.coordinator.init(
                this.lvUSD.address,
                this.vault.address,
                this.cdp.address,
                this.externalOUSD.address,
                this.exchanger.address,
                this.parameterStore.address,
            ),
        ]);
    }
}
