// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

// This contract will interact with LUSD and BProtocol
//  - Helps deposit LUSD in to stability pool (directly or BProtocol)
//  - Helps withdraw from stability pool
//  - Helps aggregate LQTY back into the stability pool directly
//  - Helps with taking fees from rewards

interface IAggregatorLusd {
    // Only Executive can call this method
    // Dump LUSD from fromAddress into Archimedes LUSD trove in SP
    // we'll likely use BProtocol to actually do this
    function depositIntoSP(uint256 amount, address fromAddress) external;

    function withdrawFromSP(uint256 amount, address toAddress) external;

    // This method checks if there are ENOUGH rewards to claim accounting for gas etc etc
    // Will probably be used as the checker for Gelato
    function shouldClaimETHRewards() external view returns (bool);

    // This method will claim fees on rewards (in ETH) and recompounds whatever left into SP.
    // 100% of rewards will be taken as fee from EXPIRED positions (using CDP's getPercentageExpiredShares)
    // performance fee of X% will be taken as fee from ACTIVE positions
    // Whatever is left, recompound using an internal method
    // Will probably be used as the executor for Gelato
    function processETHRewardsAndTakeFees() external returns (uint256 feesTakenAmount, uint256 recompoundAmount);

    /// Same as above but for <QTY
    function shouldClaimLQTYRewards() external view returns (bool);

    function processLQTYRewardsAndTakeFees() external returns (uint256 feesTakenAmount, uint256 recompoundAmount);

    // how much was manually deposited by aggregator into SP
    function getTotalDepositedIntoSP() external view returns (uint256);

    // handled variable is updated when 
    // - we deposit into SP
    // - we withdraw from SP
    // - we process rewards and take fees
    function getTotalHandledLusdFromSP() external view returns (uint256);
}
