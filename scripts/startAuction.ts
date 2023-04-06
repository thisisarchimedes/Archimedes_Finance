import { ethers, network } from "hardhat";
import { impersonateAccount } from "../integrationTests/IntegrationTestContext";
import { Contracts } from "./ProjectInit/Contracts";
import { AuctionInfo, LeverageHelper } from "./ProjectInit/LeverageHelper";
import { Logger } from "./ProjectInit/Logger";
import { DeployedStore } from "./ProjectInit/MainnetDeployment/DeployedStore";
import { NumberBundle } from "./ProjectInit/NumberBundle";
import { Signers } from "./ProjectInit/Signers";

/// test class
async function main() {
    Logger.setVerbose(true);
    console.log("set signers");
    const signers = await new Signers().init();
    const ethSigners = await ethers.getSigners();
    console.log({ signersCount: ethSigners.length });
    const signerAddresses = ethSigners.map((signer) => signer.address);
    console.log({ signerAddresses });
    console.log("set contracts");
    const contracts = await new Contracts(signers);
    await contracts.setArchimedesUpgradableContractsInstances(
        DeployedStore.parameterStoreAddress,
        DeployedStore.cdpAddress,
        DeployedStore.coordinatorAddress,
        DeployedStore.exchangerAddress,
        DeployedStore.leverageEngineAddress,
        DeployedStore.positionTokenAddress,
        DeployedStore.poolManagerAddress,
        DeployedStore.auctionAddress,
        DeployedStore.zapperAddress,
    );
    console.log("impersonate account");

    let signerAuctioneer, signerAdmin;
    if (network.name === "persistant") {
        /**  IF ON AWS FORK (PERSISTANT) NEED TO IMPERSONATE THE ADDRESSES USING A DIFFERENT APPROACH , WORKAROUND FOR HardhatError: HH103
    https://github.com/NomicFoundation/hardhat/issues/1226#issuecomment-1181706467 */

        const provider = new ethers.providers.JsonRpcProvider("http://ec2-54-211-119-50.compute-1.amazonaws.com:8545");

        await provider.send("hardhat_impersonateAccount", ["0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744"]);
        signerAuctioneer = provider.getSigner("0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744");
        signerAdmin = provider.getSigner("0x01d3aa4c9a61f5fb4b3ef5ad90c0e02ccf861842");
        // fund accounts using ethSigners owner (account from hardhat.config.ts)
        await signers.owner.sendTransaction({ to: "0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744", value: ethers.utils.parseEther("10") });
        await signers.owner.sendTransaction({ to: "0x95622e85962BC154c76AB24e48FdF6CdAeDAd6E5", value: ethers.utils.parseEther("10") });
        await signers.owner.sendTransaction({ to: "0x01d3aa4c9a61f5fb4b3ef5ad90c0e02ccf861842", value: ethers.utils.parseEther("10") });
    } else if (network.name === "hardhat") {
        /** IF NOT ON FORK (PERSISTANT) NEED TO FUND THE ADDRESSES AND IMPERSONATE THEM WITH ETHERS */
        await signers.owner.sendTransaction({ to: "0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744", value: ethers.utils.parseEther("10") });
        await signers.owner.sendTransaction({ to: "0x95622e85962BC154c76AB24e48FdF6CdAeDAd6E5", value: ethers.utils.parseEther("10") });
        await signers.owner.sendTransaction({ to: "0x01d3aa4c9a61f5fb4b3ef5ad90c0e02ccf861842", value: ethers.utils.parseEther("10") });
        signerAuctioneer = await ethers.getImpersonatedSigner("0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744");
        signerAdmin = await ethers.getImpersonatedSigner("0x01d3aa4c9a61f5fb4b3ef5ad90c0e02ccf861842");
    } else {
        /** trying to run on another network, throw error
         *  unsure if this is necessary but I'd rather not have any1 running this anywhere else on accident */
        throw new Error("Must be on hardhat or persistant network to run this script");
    }

    console.log("stop previous auction");
    // await contracts.auction.connect(signerAuctioneer).stopAuction();
    const isAuctionClosed = await contracts.auction.connect(signerAuctioneer).isAuctionClosed();
    const owner = ethSigners[0];
    const ownerBalance = await owner.getBalance();
    console.log({
        url: (network.config as any)?.url,
        name: network.name,
        isAuctionClosed,
        chainId: network.config.chainId,
        ownerBalance: ethers.utils.formatEther(ownerBalance.toString()),
        auctioneerBalance: ethers.utils.formatEther(await signerAuctioneer.getBalance()),
        adminBalance: ethers.utils.formatEther(await signerAdmin.getBalance()),
    });

    const leverageAmount = NumberBundle.withNum(5e5, 18).getBn();
    console.log("setting tokens");
    await contracts.setTokensInstances(DeployedStore.lvUSDAddress, DeployedStore.archTokenAddress);
    await contracts.setExternalTokensInstances();
    console.log("mint lvUSd");
    await contracts.lvUSD.connect(signerAdmin).setMintDestination(contracts.coordinator.address);
    await contracts.lvUSD.connect(signerAuctioneer).mint(leverageAmount);
    console.log("starting new auction");
    await contracts.auction
        .connect(signerAuctioneer)
        .startAuctionWithLength(5760, NumberBundle.withNum(2e4, 18).getBn(), NumberBundle.withNum(3e4, 18).getBn());
    if (await contracts.auction.isAuctionClosed()) {
        throw new Error("Must be in an active auction to accept leverage");
    } else {
        console.log("accepting leverage");
        await contracts.coordinator.connect(signerAuctioneer).acceptLeverageAmount(leverageAmount);
    }
    const isAuctionClosedAfterOpen = await contracts.auction.connect(signerAuctioneer).isAuctionClosed();
    console.log({ url: (network.config as any)?.url, name: network.name, isAuctionClosedAfterOpen, chainId: network.config.chainId });
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
