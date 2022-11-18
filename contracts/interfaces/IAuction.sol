// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IAuction {
    event AuctionStart(uint256 auctionId, uint256 startBlock, uint256 endBlock, uint256 startPrice, uint256 endPrice);

    function startAuction(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) external;

    function getCurrentBiddingPrice() external view returns (uint256 auctionBiddingPrice);
}
