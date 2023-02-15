// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ICDP {
    // * CDP Getters *//
    function getOUSDPrinciple(uint256 nftID) external view returns (uint256);

    // function getOUSDInterestEarned(uint256 nftID) public view  returns (uint256);

    // function getOUSDTotalIncludeInterest(uint256 nftID) public view  returns (uint256);

    function getOUSDTotalWithoutInterest(uint256 nftID) external view  returns (uint256);

    function getLvUSDBorrowed(uint256 nftID) external view  returns (uint256);

    function getShares(uint256 nftID) external view  returns (uint256);

    function getPositionTimeOpened(uint256 nftID) external view  returns (uint256);

    function getPositionTimeToLive(uint256 nftID) external view  returns (uint256);

    function getPositionExpireTime(uint256 nftID) external view  returns (uint256);
}
