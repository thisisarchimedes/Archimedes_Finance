// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IAuction {
    event AuctionStart(uint256 auctionId, uint256 startBlock, uint256 endBlock, uint256 startPrice, uint256 endPrice);
    event AuctionForcedStopped(uint256 auctionId);

    function startAuctionWithLength(
        uint256 length,
        uint256 startPrice,
        uint256 endPrice
    ) external;

    function startAuction(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) external;

    function stopAuction() external;

    function getCurrentBiddingPrice() external view returns (uint256 auctionBiddingPrice);
}
