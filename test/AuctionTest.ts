import { assert, expect } from "chai";
import hre, { ethers } from "hardhat";

import { helperSwapETHWithOUSD } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { formatUnits } from "ethers/lib/utils";
import { logger } from "../logger";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

function bnFromNum (num: number): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function bnFromStr (num: string): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function numFromBn (num: BigNumber): number {
    return Number(ethers.utils.formatUnits(num));
}

describe("Auction test suite", function () {
    const startPrice: BigNumber = bnFromNum(200);
    const endPrice: BigNumber = bnFromNum(300);
    const length = 10;
    const lengthBN: BigNumber = BigNumber.from(length);
    const incrementalPricePerBlock: BigNumber = bnFromNum((300 - 200) / length);
    let owner;
    async function setupFixture () {
        [owner] = await ethers.getSigners();
        const auctionFactory = await ethers.getContractFactory("Auction");
        const auction = await hre.upgrades.deployProxy(auctionFactory, [], { kind: "uups" });
        await startAuction(auction);
        return auction;
    }

    async function startAuction (auction: Contract) {
        /// Not sure why, but ethers return a block in delay of 2 from solidity...
        /// We can Add 2 to fix this
        // const startBlock = await ethers.provider.blockNumber + 2;
        // OR instead use startAuctionWithLength
        await auction.startAuctionWithLength(length, startPrice, endPrice);
    }

    async function mineBlocks (blocksToMine = 1) {
        for (let i = 0; i < blocksToMine; i++) {
            await ethers.provider.send("evm_mine");
        }
    }

    describe("Auction calculation tests", function () {
        it("Should return startPrice when just starting auction", async function () {
            const auction = await loadFixture(setupFixture);

            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            expect(startPrice).to.equal(currentAuctionPrice);
        });

        it("Should increase price after blocks are mined", async function () {
            const auction = await loadFixture(setupFixture);

            /// wait 1 block
            await mineBlocks();
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            expect(bnFromNum(210)).to.equal(currentAuctionPrice);

            /// wait 2 more blocks
            await mineBlocks(2);
            const currentAuctionPriceAfter3 = await auction.getCurrentBiddingPrice();

            expect(startPrice.add(incrementalPricePerBlock.mul(BigNumber.from(3)))).to.equal(currentAuctionPriceAfter3);
        });

        it("Should return endPrice when auction ends", async function () {
            const auction = await loadFixture(setupFixture);

            // check exactly when auction ends
            await mineBlocks(length);
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            expect(endPrice).to.equal(currentAuctionPrice);

            // Check a after a bunch of blocks
            await mineBlocks(length * 2);
            const currentAuctionPriceAfterEnd = await auction.getCurrentBiddingPrice();
            expect(endPrice).to.equal(currentAuctionPriceAfterEnd);
        });
    });

    describe("Auction start/stop test suite", function () {
        it("Should not be able to start auction if there is a running auction", async function () {
            const auction = await loadFixture(setupFixture);
            await expect(startAuction(auction)).to.be.revertedWith("err:auction currently running");
        });

        it("should be able to close auction and get endPrice", async function () {
            const auction = await loadFixture(setupFixture);

            await auction.stopAuction();
            await mineBlocks(1);

            // expect auction to be closed
            const isAuctionClosed = await auction.isAuctionClosed();
            expect(isAuctionClosed).to.equal(true);

            // expect price to equql end price since auction is closed
            const currentAuctionPriceAfterEnd = await auction.getCurrentBiddingPrice();
            expect(endPrice).to.equal(currentAuctionPriceAfterEnd);
        });

        it("Should be able to stop action and then start a new auction", async function () {
            const auction = await setupFixture(); // No load fixture on purpose
            // expect auction to be open
            let isAuctionClosed = await auction.isAuctionClosed();
            expect(isAuctionClosed).to.equal(false);

            await auction.stopAuction();

            // expect auction to be closed
            isAuctionClosed = await auction.isAuctionClosed();
            expect(isAuctionClosed).to.equal(true);

            await startAuction(auction);

            // expect auction to be open
            isAuctionClosed = await auction.isAuctionClosed();
            expect(isAuctionClosed).to.equal(false);

            // expect starting price
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            expect(startPrice).to.equal(currentAuctionPrice);
        });
    });
});
