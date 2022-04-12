// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "hardhat/console.sol";

/// @title CDPosition is ledger contract for all  NFT positions and regular positions
/// @dev CDP creates and destroy NFT and address positions. It keep tracks of how many tokens user has borrowed.
/// It keeps track of how much interest each position accrue
/// @notice CDPosition does not hold any tokens. It is not a vault of any kind.
/// @notice CDP does not emit any events. All related events will be emitted by the calling contract.
/// @notice This contract (will be) proxy upgradable
contract CDPosition {
    struct cdp {
        uint256 oUSDPrinciple; // Amount of OUSD originally deposited by user
        uint256 oUSDInterestEarned; // Total interest earned (and rebased) so far
        uint256 oUSDTotal; // Principle + OUSD acquired from selling borrowed lvUSD + Interest earned
        uint256 lvUSDBorrowed; // Total lvUSD borrowed under this position
        bool firstCycle; // to prevent quick "in and out", we don't credit interest to a position at first the interest payment cycle
    }

    uint256 internal globalCollateralRate;

    mapping(uint256 => cdp) internal nftCDP;

    /// @dev add new entry to nftid<>CPP map with ousdPrinciple.
    /// Set CDP.firstCycle = true
    /// Update both principle and total with OUSDPrinciple
    /// @param nftID newly minted NFT
    /// @param oOUSDPrinciple initial OUSD investment (ie position principle)
    function createPosition(uint256 nftID, uint256 oOUSDPrinciple)
        external
        nftIDMustNotExist(nftID)
    {
        _addPositionToTrackingArray(nftID);
        nftCDP[nftID] = cdp(oOUSDPrinciple, 0, oOUSDPrinciple, 0, true);
    }

    /// @dev delete entry in CDP --if-- lvUSD borrowed balance is zero
    ///
    /// @param nftID entry address to delete
    function deletePosition(uint256 nftID)
        external
        nftIDMustExist(nftID)
        canDeletePosition(nftID)
    {
        _deletePositionFromTrackingArray(nftID);
        /// Set all values to default. Not way to remove key from mapping in solidity
        delete nftCDP[nftID];
    }

    /// @dev update borrowed lvUSD in position. This method adds a delta to existing borrowed value
    /// @param nftID NFT position to update
    /// @param lvUSDAmountToBorrow amount to add to position's existing borrowed lvUSD sum
    function borrowLvUSDFromPosition(uint256 nftID, uint256 lvUSDAmountToBorrow)
        external
        nftIDMustExist(nftID)
    {
        nftCDP[nftID].lvUSDBorrowed += lvUSDAmountToBorrow;
    }

    /// @dev update borrowed lvUSD in position. This method removed a delta to existing borrowed value
    /// @param nftID NFT position to update
    /// @param lvUSDAmountToRepay amount to remove fom position's existing borrowed lvUSD sum
    function repayLvUSDToPosition(uint256 nftID, uint256 lvUSDAmountToRepay)
        external
        nftIDMustExist(nftID)
    {
        require(
            nftCDP[nftID].lvUSDBorrowed >= lvUSDAmountToRepay,
            "lvUSD Borrowed amount must be greater or equal than amount to repay"
        );
        nftCDP[nftID].lvUSDBorrowed -= lvUSDAmountToRepay;
    }

    /// @dev update deposited OUSD in position. This method adds a delta to existing deposited value
    /// @param nftID NFT position to update
    /// @param oUSDAmountToDeposit amount to add to position's existing deposited sum
    function depositOUSDtoPosition(uint256 nftID, uint256 oUSDAmountToDeposit)
        external
        nftIDMustExist(nftID)
    {
        nftCDP[nftID].oUSDTotal += oUSDAmountToDeposit;
    }

    /// @dev update deposited OUSD in position. This method removed a delta to existing deposited value
    /// @param nftID NFT position to update
    /// @param oUSDAmountToWithdraw amount to remove to position's existing deposited sum
    function withdrawOUSDFromPosition(
        uint256 nftID,
        uint256 oUSDAmountToWithdraw
    ) external nftIDMustExist(nftID) {
        require(
            nftCDP[nftID].oUSDTotal >= oUSDAmountToWithdraw,
            "OUSD total amount must be greater or equal than amount to withdraw"
        );
        nftCDP[nftID].oUSDTotal -= oUSDAmountToWithdraw;
    }

    /// @dev update collateral rate
    ///
    /// @notice Max lvUSD that can be minted for 1 OUSD
    ///
    /// @param rate new rate to set as collateral
    function changeCollateralRate(uint256 rate) external {
        globalCollateralRate = rate;
    }

    function getCollateralRate() external view returns (uint256) {
        return globalCollateralRate;
    }

    // Maps return default value when entry is not present. OUSD principle will always be gt 0 if nftCDP has
    // a valid value in nftID
    modifier nftIDMustExist(uint256 nftID) {
        require(nftCDP[nftID].oUSDPrinciple > 0, "NFT ID must exist");
        _;
    }
    modifier nftIDMustNotExist(uint256 nftID) {
        require(nftCDP[nftID].oUSDPrinciple == 0, "NFT ID must not exist");
        _;
    }

    modifier canDeletePosition(uint256 nftID) {
        // console.log("CDP:canDeletePosition:cdp[nft] %s");
        require(
            nftCDP[nftID].lvUSDBorrowed == 0,
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
        return nftCDP[nftID].oUSDPrinciple;
    }

    function getOUSDInterestEarned(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return nftCDP[nftID].oUSDInterestEarned;
    }

    function getOUSDTotal(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return nftCDP[nftID].oUSDTotal;
    }

    function getLvUSDBorrowed(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (uint256)
    {
        return nftCDP[nftID].lvUSDBorrowed;
    }

    function getFirstCycle(uint256 nftID)
        external
        view
        nftIDMustExist(nftID)
        returns (bool)
    {
        return nftCDP[nftID].firstCycle;
    }

    /// Public for testing
    uint256 public _totalNftEntries;
    uint256[] public _nftIDArray; // list out all valid and live NFT ID
    mapping(uint256 => uint256) public _nftIDToArrayLocation;

    // end public for testing

    function _addPositionToTrackingArray(uint256 nftID) internal {
        _nftIDArray.push(nftID); // Push nft to end of array
        _nftIDToArrayLocation[nftID] = _totalNftEntries; // the index location of nftID in array
        _totalNftEntries += 1;
    }

    function _deletePositionFromTrackingArray(uint256 nftID) internal {
        uint256 nftToDeleteArrayIndex = _nftIDToArrayLocation[nftID];
        uint256 nftIDToSave = _nftIDArray[_totalNftEntries - 1]; // last valid nft id in array

        console.log(
            "%s nft is in location in array %s",
            nftID,
            _nftIDToArrayLocation[nftID]
        );
        console.log("total entries at this stage is  %s", _totalNftEntries);
        console.log("nftIDToSave", nftIDToSave);
        // swap _nftIDArray[nftToDeleteArrayIndex] with last entry in array 
        _nftIDArray[nftToDeleteArrayIndex] = nftIDToSave;
        _nftIDToArrayLocation[nftID] = 0; // delete last entry in array now that is not being used anymore

        _totalNftEntries -= 1;
    }
}
