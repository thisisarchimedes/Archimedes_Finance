import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Contracts } from "../scripts/ProjectInit/Contracts";
import { EtherUtils } from "../scripts/ProjectInit/EtherUtils";
import { NumberBundle } from "../scripts/ProjectInit/NumberBundle";
import { PositionInfo } from "../scripts/ProjectInit/PositionInfo";
import { TestConstants } from "../scripts/ProjectInit/TestConstants";
import {
    createPositionFixture,
    defaultAuction,
    setupContractsFixture,
    setupUpgradesFixture,
    startAuctionFixture,
} from "./envSetupForTests";

describe("Expire position test suit", function () {
    it("should not be able to expire position that is not yet expired", async function () {
        const contracts: Contracts = await loadFixture(setupForExpireTestFixture);
        const expirePromise =
            contracts.leverageEngine.connect(contracts.signers.owner)
                .expirePosition(initPosition.positionTokenNum, TestConstants.ONE_ETH.getBn());
        await expect(expirePromise).to.be.revertedWith("positionNotExpired");
    });

    it("Should be able to expire position if enough time had passed", async function () {
        const contracts: Contracts = await loadFixture(setupForExpireTestFixture);
        await moveTimeForward();

        await contracts.leverageEngine.connect(contracts.signers.owner)
            .expirePosition(initPosition.positionTokenNum, TestConstants.ONE_ETH.getBn());
    });

    it("should burn position token when msg.sender is not owner", async function () {
        const contracts: Contracts = await loadFixture(setupForExpireTestFixture);
        await moveTimeForward();
        const positionId = initPosition.positionTokenNum;
        await contracts.leverageEngine.connect(contracts.signers.owner)
            .expirePosition(positionId, TestConstants.ONE_ETH.getBn());

        expect(
            await contracts.positionToken.exists(positionId),
        ).to.be.false;
    });

    it("Should pass shares to owner of position when unwinding", async function () {
        const contracts: Contracts = await loadFixture(setupForExpireTestFixture);
        await moveTimeForward();
        const positionId = initPosition.positionTokenNum;

        const maxWithdrawBefore = NumberBundle.withBn(await contracts.expiredVault.maxWithdraw(initPosition.positionOwner.address));
        expect(maxWithdrawBefore.getNum())
            .to.be.equal(0);

        await contracts.leverageEngine.connect(contracts.signers.owner)
            .expirePosition(positionId, TestConstants.ONE_ETH.getBn());
        const maxWithdraw = NumberBundle.withBn(await contracts.expiredVault.maxWithdraw(initPosition.positionOwner.address));

        expect(maxWithdraw.getNum())
            .to.be.greaterThan(initPosition.collateral.getNum() * 0.92);
    });

    it("Should allow owner to claim funds after position expired", async function () {
        const contracts: Contracts = await loadFixture(setupForExpireTestFixture);
        await moveTimeForward();
        const positionId = initPosition.positionTokenNum;
        await contracts.leverageEngine.connect(contracts.signers.owner)
            .expirePosition(positionId, TestConstants.ONE_ETH.getBn());

        /// check that user can redeem on vault by redeeming all shares owned by user and make sure OUSD balance of user is updated
        const sharesToRedeem = NumberBundle.withBn(await contracts.expiredVault.maxRedeem(initPosition.positionOwner.address));
        const owneOUSDBalanceBefore = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(initPosition.positionOwner.address));
        await contracts.expiredVault.connect(initPosition.positionOwner)
            .redeem(sharesToRedeem.getBn(),
                initPosition.positionOwner.address,
                initPosition.positionOwner.address);
        const owneOUSDBalanceAfter = NumberBundle.withBn(await contracts.externalOUSD.balanceOf(initPosition.positionOwner.address));

        expect(owneOUSDBalanceAfter.getNum() - owneOUSDBalanceBefore.getNum()).to.be.greaterThan(initPosition.collateral.getNum() * 0.92);
    });

    it("should emit PositionExpired event when position is expired", async function () {
        const contracts: Contracts = await loadFixture(setupForExpireTestFixture);
        await moveTimeForward();
        const positionId = initPosition.positionTokenNum;
        /// use static call to get windfall, get shares from that
        const positionWindfall = NumberBundle.withBn(await contracts.leverageEngine
            .connect(contracts.signers.owner)
            .callStatic
            .expirePosition(positionId, TestConstants.ONE_ETH.getBn()),
        );
        const positionExpiredShares = NumberBundle.withBn(await contracts.expiredVault.previewDeposit(positionWindfall.getBn()));
        console.log("positionWindfall %s , shares ", positionWindfall.getNum(), positionExpiredShares.getNum());

        await expect(contracts.leverageEngine.connect(contracts.signers.owner)
            .expirePosition(positionId, TestConstants.ONE_ETH.getBn()))
            .to.emit(contracts.leverageEngine, "PositionExpired")
            .withArgs(
                initPosition.positionOwner.address,
                positionId,
                positionExpiredShares.getBn(),
                positionWindfall.getBn());
    });
});

/*
 * Helper methods
 *
 */

let initPosition: PositionInfo;
const onedayInSec = 3600 * 24;

async function setupForExpireTestFixture(): Promise<Contracts> {
    const contracts: Contracts = await setupContractsFixture();
    await setupUpgradesFixture(contracts);
    await contracts.leverageEngine.connect(contracts.signers.owner).setExpiredVault(contracts.expiredVault.address);
    await startAuctionFixture(contracts, defaultAuction);
    await contracts.parameterStore.connect(contracts.signers.governor).changePositionTimeToLiveInDays(31);
    initPosition = await PositionInfo.build(contracts, contracts.signers.c1, NumberBundle.withNum(1000), 12);
    await createPositionFixture(contracts, initPosition);
    return contracts;
}

async function moveTimeForward(days = 32) {
    await time.increase(onedayInSec * days);
    await EtherUtils.mineBlocks(1);
}
