// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IAuction} from "../contracts/interfaces/IAuction.sol";
import "hardhat/console.sol";

contract Auction is IAuction {
    uint256 internal _currentAuctionId;
    uint256 internal _startBlock;
    uint256 internal _endBlock;
    uint256 internal _startPrice;
    uint256 internal _endPrice;

    function startAuction(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) external override {
        // uint256 currentBlock = block.number;
        // console.log("starting action with currentBlock : %s, endBlock: %s startPrice: %s endPrice: %s",
        //     currentBlock, endBlock, startPrice, endPrice
        // );
        if (_isValidAuctionParams(endBlock, startPrice, endPrice)) {
            _setAuctionPrivateMembers(endBlock, startPrice, endPrice);
        } else {
            revert("could not start auction");
        }
    }

    function getCurrentBiddingPrice() external view override returns (uint256 auctionBiddingPrice) {
        /// If reached endBlock , handle auction that is "closed"
        /// ELSE calculate current price for an open auction.
        console.log("endBlock %s currentBlock %s", _endBlock, block.number);
        if (_endBlock < block.number) {
            return _getCurrentPriceClosedAuction();
        } else {
            return _calcCurrentPriceOpenAuction();
        }
    }

    /// calc methods

    function _getCurrentPriceClosedAuction() internal view returns (uint256 auctionPrice) {
        return _endPrice;
    }

    function _calcCurrentPriceOpenAuction() internal view returns (uint256 auctionPrice) {
        /// y = ax + b
        /// => y = current auction price.
        /// linear graph show price in Y and price is going down over time so we'll need y = -ax + b
        /// might be easier to think about this as y = b - ax
        /// time is the X axis here so when we start auction t=0, when we end t=delt(startBlock, endBlock)
        /// we want to get time that is between 0 and 1 so we'll do
        /// so this means t_current = (currentBlock - startBlock)/delt(startBlock, endBlock)
        /// b = startPrice. b has to equal startPrice since t=0 at that point
        /// a = (startingPrice - endPrice)
        // curentPrice =  b - ax = startPrice - (startingPrice - endPrice) * t(0...1 only)
        uint256 deltaInPrices = _startPrice - _endPrice;
        uint256 deltaInPriceMulCurrentTime = (deltaInPrices * (block.number - _startBlock)) / (_endBlock - _startBlock);
        uint256 maxPriceForAuction = _startPrice;

        uint256 currentPrice = maxPriceForAuction - deltaInPriceMulCurrentTime;
        // console.log("deltaInPrices %s deltaInPriceMulCurrentTime %s ,maxPriceForAuction %s", deltaInPrices, deltaInPriceMulCurrentTime, maxPriceForAuction);
        return currentPrice;
    }

    /// helper methods

    function _isValidAuctionParams(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) internal pure returns (bool) {
        return true;
    }

    function _setAuctionPrivateMembers(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) internal {
        _currentAuctionId = _currentAuctionId + 1;
        _startBlock = block.number;
        _endBlock = endBlock;
        _startPrice = startPrice;
        _endPrice = endPrice;
    }

    /// Deplyment functionality
    constructor() {
        /// Remove once its upgradable
    }
}
