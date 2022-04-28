// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

/// @title CDPosition is ledger contract for all  NFT positions and regular positions
/// @dev CDP creates and destroy NFT and address positions. It keep tracks of how many tokens user has borrowed.
/// It keeps track of how much interest each position accrue
/// @notice CDPosition does not hold any tokens. It is not a vault of any kind.
/// @notice CDP does not emit any events. All related events will be emitted by the calling contract.
/// @notice This contract (will be) proxy upgradable
contract CDPosition {
    struct CDP {
        uint256 oUSDPrinciple; // Amount of OUSD originally deposited by user
        uint256 oUSDInterestEarned; // Total interest earned (and rebased) so far
        uint256 oUSDTotal; // Principle + OUSD acquired from selling borrowed lvUSD + Interest earned
        uint256 lvUSDBorrowed; // Total lvUSD borrowed under this position
        bool firstCycle; // to prevent quick "in and out", we don't credit interest to a position at first the interest payment cycle
    }

    uint256 internal _globalCollateralRate;

    mapping(uint256 => CDP) internal _nftCDP;

    /// @dev add new entry to nftid<>CPP map with ousdPrinciple.
    /// Set CDP.firstCycle = true
    /// Update both principle and total with OUSDPrinciple
    /// @param nftID newly minted NFT
    /// @param oOUSDPrinciple initial OUSD investment (ie position principle)
    function createPosition(uint256 nftID, uint256 oOUSDPrinciple)
        external
        nftIDMustNotExist(nftID)
    {
        _nftCDP[nftID] = CDP(oOUSDPrinciple, 0, oOUSDPrinciple, 0, true);
    }

    /// @dev delete entry in CDP --if-- lvUSD borrowed balance is zero
    ///
    /// @param nftID entry address to delete
    function deletePosition(uint256 nftID)
        external
        nftIDMustExist(nftID)
        canDeletePosition(nftID)
    {
        /// Set all values to default. Not way to remove key from mapping in solidity
        delete _nftCDP[nftID];
    }

    /// @dev update borrowed lvUSD in position. This method adds a delta to existing borrowed value
    /// @param nftID NFT position to update
    /// @param lvUSDAmountToBorrow amount to add to position's existing borrowed lvUSD sum
    function borrowLvUSDFromPosition(uint256 nftID, uint256 lvUSDAmountToBorrow)
        external
        nftIDMustExist(nftID)
    {
        // sainty check
        require (lvUSDAmountToBorrow + _nftCDP[nftID].lvUSDBorrowed <= _nftCDP[nftID].oUSDTotal,
          "Attempt to borrow to much lvUSD"); 

        _nftCDP[nftID].lvUSDBorrowed += lvUSDAmountToBorrow;
    }

    /// @dev update borrowed lvUSD in position. This method removed a delta to existing borrowed value
    /// @param nftID NFT position to update
    /// @param lvUSDAmountToRepay amount to remove fom position's existing borrowed lvUSD sum
    function repayLvUSDToPosition(uint256 nftID, uint256 lvUSDAmountToRepay)
        external
        nftIDMustExist(nftID)
    {
        require(
            _nftCDP[nftID].lvUSDBorrowed >= lvUSDAmountToRepay,
            "lvUSD Borrowed amount must be greater or equal than amount to repay"
        );
        _nftCDP[nftID].lvUSDBorrowed -= lvUSDAmountToRepay;
    }

    /// @dev update deposited OUSD in position. This method adds a delta to existing deposited value
    /// @param nftID NFT position to update
    /// @param oUSDAmountToDeposit amount to add to position's existing deposited sum
    function depositOUSDtoPosition(uint256 nftID, uint256 oUSDAmountToDeposit)
        external
        nftIDMustExist(nftID)
    {
        _nftCDP[nftID].oUSDTotal += oUSDAmountToDeposit;
    }

    /// @dev update deposited OUSD in position. This method removed a delta to existing deposited value
    /// @param nftID NFT position to update
    /// @param oUSDAmountToWithdraw amount to remove to position's existing deposited sum
    function withdrawOUSDFromPosition(
        uint256 nftID,
        uint256 oUSDAmountToWithdraw
    ) external nftIDMustExist(nftID) {
        require(
            _nftCDP[nftID].oUSDTotal >= oUSDAmountToWithdraw,
            "OUSD total amount must be greater or equal than amount to withdraw"
        );
        _nftCDP[nftID].oUSDTotal -= oUSDAmountToWithdraw;
    }

    /// @dev update collateral rate
    ///
    /// @notice Max lvUSD that can be minted for 1 OUSD
    ///
    /// @param rate new rate to set as collateral
    function changeCollateralRate(uint256 rate) external {
        _globalCollateralRate = rate;
    }

    function getCollateralRate() external view returns (uint256) {
        return _globalCollateralRate;
    }

    // Maps return default value when entry is not present. OUSD principle will always be gt 0 if _nftCDP has
    // a valid value in nftID
    modifier nftIDMustExist(uint256 nftID) {
        require(_nftCDP[nftID].oUSDPrinciple > 0, "NFT ID must exist");
        _;
    }
    modifier nftIDMustNotExist(uint256 nftID) {
        require(_nftCDP[nftID].oUSDPrinciple == 0, "NFT ID must not exist");
        _;
    }

    modifier canDeletePosition(uint256 nftID) {
        require(
            _nftCDP[nftID].lvUSDBorrowed == 0,
            "Borrowed LvUSD must be zero before deleting"
        );
        _;
    }

    // * CDP Getters *//
    function getOUSDPrinciple(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return _nftCDP[nftID].oUSDPrinciple;
    }

    function getOUSDInterestEarned(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return _nftCDP[nftID].oUSDInterestEarned;
    }

    function getOUSDTotal(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return _nftCDP[nftID].oUSDTotal;
    }

    function getLvUSDBorrowed(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return _nftCDP[nftID].lvUSDBorrowed;
    }

    function getFirstCycle(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (bool)
    {
        return _nftCDP[nftID].firstCycle;
    }
}
