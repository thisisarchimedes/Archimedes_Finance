// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface ICDPLusd {
    struct Position {
        uint256 id;
        uint256 collateral; // LUSD dominated
        uint256 leverageInLusd; // LUSD dominated, doesnt grow over time
        uint256 borrowedInLvUSD; // lvUSD dominated
        uint256 shares; // shares are issued ONLY on position creation and only deleted on unwind
        /// expiration section
        uint256 positionOpenDate; // Open date
        uint256 positionExpirationDate; // expiration date of position
        bool isPositionExpired;
        uint256 expiredPositionMaxWindfall; // this gets updated when expiring position. When claiming expired position, give user min(expiredPositionMaxWindfall, redeemOfTheirSharesFromSP)
    }

    function createPositionInCDP(
        uint256 id,
        uint256 collateral,
        uint256 leverageInLusd,
        uint256 borrowedInLvUSD
    ) external;

    // Need to delete position in CDP on unwind OR claiming expired position.
    // Will also remove shares from share total
    function deletePositionInCDP(uint256 id) external;

    // Will not remove shares from total but increase expiredShares value
    function expirePositionInCDP(uint256 id) external;

    /// get how many un redeemed shares are in circulation across all positions
    function getAmountAllShares() external view returns (uint256 totalShares);

    function getAmountExpireShares() external view returns (uint256 totalExpireShares);

    /// get the percentage of all LUSD (including accumulated) that position owns
    function getPercentageOfSharesFromAll(uint256 id) external view returns (uint256 percentageOfSharesPerPosition);

    // get percentage of expired shares from all shares
    // totalShares = 100, totalExpiredShares = 0 -> getPercentageExpiredShares = 0
    // we expire position of 10 shares
    // totalShares = 100, totalExpiredShares = 10 -> getPercentageExpiredShares = 10
    // we expire position of 20 shares
    // totalShares = 100, totalExpiredShares = 30 -> getPercentageExpiredShares = 30%
    // someone unwinds a position of 40 shares
    // totalShares = 60, totalExpiredShares = 30 -> getPercentageExpiredShares = 50%
    /// when someone with an expired position (of 20 shares) finally claims position, we basically delete the position
    /// totalShares = 40, totalExpiredShares = 10 -> getPercentageExpiredShares = 25%
    function getPercentageExpiredShares() external view returns (uint256 expiredShareOfPoolPercentage);
}
