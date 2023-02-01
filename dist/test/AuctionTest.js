"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = __importStar(require("hardhat"));
const ethers_1 = require("ethers");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
function bnFromNum(num) {
    return hardhat_1.ethers.utils.parseUnits(num.toString());
}
function bnFromStr(num) {
    return hardhat_1.ethers.utils.parseUnits(num.toString());
}
function numFromBn(num) {
    return Number(hardhat_1.ethers.utils.formatUnits(num));
}
describe("Auction test suite", function () {
    const startPrice = bnFromNum(200);
    const endPrice = bnFromNum(300);
    const length = 10;
    const lengthBN = ethers_1.BigNumber.from(length);
    const incrementalPricePerBlock = bnFromNum((300 - 200) / length);
    let owner;
    async function setupFixture() {
        [owner] = await hardhat_1.ethers.getSigners();
        const auctionFactory = await hardhat_1.ethers.getContractFactory("Auction");
        const auction = await hardhat_1.default.upgrades.deployProxy(auctionFactory, [], { kind: "uups" });
        await startAuction(auction);
        return auction;
    }
    async function startAuction(auction) {
        /// Not sure why, but ethers return a block in delay of 2 from solidity...
        /// We can Add 2 to fix this
        // const startBlock = await ethers.provider.blockNumber + 2;
        // OR instead use startAuctionWithLength
        await auction.startAuctionWithLength(length, startPrice, endPrice);
    }
    async function mineBlocks(blocksToMine = 1) {
        for (let i = 0; i < blocksToMine; i++) {
            await hardhat_1.ethers.provider.send("evm_mine");
        }
    }
    describe("Auction calculation tests", function () {
        it("Should return startPrice when just starting auction", async function () {
            const auction = await (0, hardhat_network_helpers_1.loadFixture)(setupFixture);
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(startPrice).to.equal(currentAuctionPrice);
        });
        it("Should increase price after blocks are mined", async function () {
            const auction = await (0, hardhat_network_helpers_1.loadFixture)(setupFixture);
            /// wait 1 block
            await mineBlocks();
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(bnFromNum(210)).to.equal(currentAuctionPrice);
            /// wait 2 more blocks
            await mineBlocks(2);
            const currentAuctionPriceAfter3 = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(startPrice.add(incrementalPricePerBlock.mul(ethers_1.BigNumber.from(3)))).to.equal(currentAuctionPriceAfter3);
        });
        it("Should return endPrice when auction ends", async function () {
            const auction = await (0, hardhat_network_helpers_1.loadFixture)(setupFixture);
            // check exactly when auction ends
            await mineBlocks(length);
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(endPrice).to.equal(currentAuctionPrice);
            // Check a after a bunch of blocks
            await mineBlocks(length * 2);
            const currentAuctionPriceAfterEnd = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(endPrice).to.equal(currentAuctionPriceAfterEnd);
        });
    });
    describe("Auction start/stop test suite", function () {
        it("Should not be able to start auction if there is a running auction", async function () {
            const auction = await (0, hardhat_network_helpers_1.loadFixture)(setupFixture);
            await (0, chai_1.expect)(startAuction(auction)).to.be.revertedWith("err:auction currently running");
        });
        it("should be able to close auction and get endPrice", async function () {
            const auction = await (0, hardhat_network_helpers_1.loadFixture)(setupFixture);
            await auction.stopAuction();
            await mineBlocks(1);
            // expect auction to be closed
            const isAuctionClosed = await auction.isAuctionClosed();
            (0, chai_1.expect)(isAuctionClosed).to.equal(true);
            // expect price to equql end price since auction is closed
            const currentAuctionPriceAfterEnd = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(endPrice).to.equal(currentAuctionPriceAfterEnd);
        });
        it("Should be able to stop action and then start a new auction", async function () {
            const auction = await setupFixture(); // No load fixture on purpose
            // expect auction to be open
            let isAuctionClosed = await auction.isAuctionClosed();
            (0, chai_1.expect)(isAuctionClosed).to.equal(false);
            await auction.stopAuction();
            // expect auction to be closed
            isAuctionClosed = await auction.isAuctionClosed();
            (0, chai_1.expect)(isAuctionClosed).to.equal(true);
            await startAuction(auction);
            // expect auction to be open
            isAuctionClosed = await auction.isAuctionClosed();
            (0, chai_1.expect)(isAuctionClosed).to.equal(false);
            // expect starting price
            const currentAuctionPrice = await auction.getCurrentBiddingPrice();
            (0, chai_1.expect)(startPrice).to.equal(currentAuctionPrice);
        });
    });
});
