import { assert, expect } from "chai";
import { ethers } from "hardhat";

import { helperSwapETHWithOUSD } from "./MainnetHelper";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { formatUnits } from "ethers/lib/utils";
import { logger } from "../logger";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

function bnFromNum(num:number): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function bnFromNum(num:string): BigNumber {
    return ethers.utils.parseUnits(num.toString());
}

function numFromBn(num:BigNumbers) : number {
    return Number(ethers.utils.formatUnits(num))
}

describe("Auction test suite", function() {
    const startPrice: BigNumber  = bnFromNum(300)
    const endPrice: BigNumber = bnFromNum(200)
    const length: number = 10;
    const lengthBN: BigNumber = BigNumber.from(length);
    const incrementalPricePerBlock: BigNumber = bnFromNum((300 - 200)/length)

    async function setupFixture() {
        const auctionfactory = await ethers.getContractFactory("Auction");
        const auction = await auctionfactory.deploy();
        await startAuction(auction)
        return auction;
    }

    async function startAuction(auction: Contract) {
        /// Not sure why, but ethers return a block in delay of 2 from solidity...
        /// Add 2 to fix this
        const startBlock = await ethers.provider.blockNumber + 2;
        const endBlock = startBlock + length;
        await auction.startAuction(endBlock,startPrice,endPrice);
    }

    async function mineBlocks(blocksToMine = 1){
        for (let i = 0; i < blocksToMine ; i++) {
            await ethers.provider.send('evm_mine');   
        }
    }

    describe("Auction calculation tests", function() {
        it("Should return startPrice when just starting auction", async function () {
            const auction = await loadFixture(setupFixture);

            const currentAuctionPrice = await auction.getCurrentBiddingPrice()
            expect(startPrice).to.equal(currentAuctionPrice)
        });

        it("Should reduce price after blocks are mined", async function () {
            const auction = await loadFixture(setupFixture);

            /// wait 1 block
            await mineBlocks()
            const currentAuctionPrice = await auction.getCurrentBiddingPrice()
            expect(bnFromNum(290)).to.equal(currentAuctionPrice)

            /// wait 2 more blocks
            await mineBlocks(2)
            const currentAuctionPriceAfter3 = await auction.getCurrentBiddingPrice()

            expect(startPrice.sub(incrementalPricePerBlock.mul(BigNumber.from(3)))).to.equal(currentAuctionPriceAfter3)
        });

        it("Should return endPrice when auction ends", async function () {
            const auction = await loadFixture(setupFixture);
            
            // check exactly when auction ends
            await mineBlocks(length)
            const currentAuctionPrice = await auction.getCurrentBiddingPrice()
            expect(endPrice).to.equal(currentAuctionPrice)

            // Check a after a bunch of blocks
            await mineBlocks(length*2)
            const currentAuctionPriceAfterEnd = await auction.getCurrentBiddingPrice()
            expect(endPrice).to.equal(currentAuctionPriceAfterEnd)
        })

    });

    
});