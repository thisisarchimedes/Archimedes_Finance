import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LogDescription } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import { Contracts } from "../scripts/ProjectInit/Contracts";
import { EtherUtils } from "../scripts/ProjectInit/EtherUtils";
import { AuctionInfo, LeverageHelper } from "../scripts/ProjectInit/LeverageHelper";
import { Logger } from "../scripts/ProjectInit/Logger";
import { deployOrGetAllContracts } from "../scripts/ProjectInit/MainnetDeployment/Helpers";
import { NumberBundle } from "../scripts/ProjectInit/NumberBundle";
import { Pools } from "../scripts/ProjectInit/Pools";
import { PositionInfo } from "../scripts/ProjectInit/PositionInfo";
import { PositionManager } from "../scripts/ProjectInit/PositionManager";
import { Signers } from "../scripts/ProjectInit/Signers";
import { ValueStore } from "../scripts/ProjectInit/ValueStore";


const treasuryAddress = "0x29520fd76494Fd155c04Fa7c5532D2B2695D68C6";
const gnosisOwnerAddress = "0x84869Ccd623BF5Fb1d18E61A21B20d50cC786744";
const auctioneerAddress = "0x68AFb79D25C9740e036b264A92d26eF95B4B9Ae7";

export const defaultAuction = new AuctionInfo(
    7096,
    NumberBundle.withNum(20750),
    NumberBundle.withNum(25000),
    NumberBundle.withNum(500000),
);

export async function getDefaultPosition(contracts: Contracts): Promise<PositionInfo> {
    const position = await PositionInfo.build(contracts, contracts.signers.c1, NumberBundle.withNum(1000), 12);
    return position;
}


export async function setupContractsFixture(): Promise<Contracts> {
    const signers = await new Signers().init();
    const contracts = await new Contracts(signers);
    contracts.signers.treasury = await ImpersonateAndFund(treasuryAddress);
    contracts.signers.owner = await ImpersonateAndFund(gnosisOwnerAddress);
    contracts.signers.governor = await ImpersonateAndFund(auctioneerAddress);
    await deployOrGetAllContracts(contracts, false, false, false);
    return contracts;
}

export async function setupUpgradesFixture(contracts: Contracts) {
    const newLevEngineImp = await contracts.deployContract("LeverageEngine");
    await contracts.leverageEngine.connect(contracts.signers.owner).upgradeTo(newLevEngineImp.address);

    // const newParamStoreImp = await contracts.deployContract("ParameterStore");
    // await contracts.parameterStore.connect(contracts.signers.owner).upgradeTo(newParamStoreImp.address);

    const newVault = await contracts.deployContractProxy("VaultOUSDExpired", [ValueStore.addressOUSD, "VaultOUSD", "VOUSD"]);
    contracts.expiredVault = newVault;
}

export async function createPositionFixture(contracts: Contracts, position: PositionInfo) {
    const pools = await new Pools().init(contracts);
    const positionManager = new PositionManager(contracts, pools);
    await positionManager.fundSignerForPosition(position.positionOwner, false)
    await positionManager.createPositionEndToEnd(position, true);
}

export async function startAuctionFixture(contracts: Contracts, auction: AuctionInfo) {
    const leverageHelper = new LeverageHelper(contracts);
    const gnosisOwner = await ImpersonateAndFund(gnosisOwnerAddress);
    const auctioneer = await ImpersonateAndFund(auctioneerAddress);
    await contracts.lvUSD.connect(gnosisOwner).mint(auction.leverageAmount.getBn());
    await leverageHelper.startAuctionAndAcceptLeverage(auction, auctioneer);
    await EtherUtils.mineBlock();
}

async function ImpersonateAndFund(address: string): Promise<SignerWithAddress> {
    const acount = await ethers.getImpersonatedSigner(address);
    const signers = await new Signers().init();
    const tx = await signers.owner.sendTransaction({
        to: acount.getAddress(),
        value: ethers.utils.parseEther("10.0"),
    });
    return acount
}

