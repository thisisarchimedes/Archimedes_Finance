// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "hardhat/console.sol";

contract CDPosition {
    struct cdp {
        uint256 oUSDPrinciple; // Amount of OUSD originally deposited by user
        uint256 oUSDInterestEarned; // Total interest earned (and rebased) so far
        uint256 oUSDTotal; // Principle + OUSD acquired from selling borrowed lvUSD + Interest earned
        uint256 lvUSDBorrowed; // Total lvUSD borrowed under this position
        bool firstCycle; // to prevent quick "in and out", we don't credit interest to a position at first the interest payment cycle
    }

    uint256 private globalCollateralRate;

    mapping(uint256 => cdp) private nftCDP;
    /// late add on to be able to iterate 
    /// TODO : remove position when deleting, add position when creating. Maybe we want to check
    uint256 public totalEntries = 0;
    uint256[] createdNFtPositions;

    /// @dev distribute interest into positions based on the latest OUSD rewards cycle (also sends protocol fees to vault)
    ///
    /// @notice Reward cycle will be triggered by an event, interest is originally paid into vault
    /// @notice Emit pay interest event
    /// @notice Dont pay interest if CDP.firstCycle==true. Mark every CDP.firstCycle to false
    /// @notice pay based on totalOUSDInArch VSVS position OUSD total
    /// @notice For source of truth, use balanceOf[vault address] on ousdContract
    ///
    /// @param interestToPay total rebased ousd in vault (meaning ousd deposited + interest already payed to positions)
    function payInterestToPositions(uint256 interestToPay) external {
        /// TODO: Add pay to treasury
    }

    /// @dev add new entry to nftid<>CPP map with ousdPrinciple.
    /// Set CDP.firstCycle = true
    /// Update both principle and total with OUSDPrinciple
    /// @param nftID newly minted NFT
    /// @param oOUSDPrinciple initial OUSD investment (ie position principle)
    function createPosition(uint256 nftID, uint256 oOUSDPrinciple)
        external
        nftIDMustNotExist(nftID)
    {
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
        /// Set all values to default. Not way to remove key from mapping in solidity
        nftCDP[nftID] = cdp(0, 0, 0, 0, false);
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
            "lvUSD Borrowed amount must be greater than amount to repay"
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
        nftCDP[nftID].oUSDTotal -= oUSDAmountToWithdraw;
    }

    // /// @dev get how much NFTid can (yet) borrow in lvUSD
    // /// @notice Amount available to borrow = [collateral rate - (Amount lvUSD borrowed / Total OUSD under this position)] * Total OUSD under this position
    // ///
    // /// @param nftID
    // function amountOfLvUSDAvailableToBorrow(uint256 nftID) view public; -- need to know collateral rate

    /// @dev update collateral rate
    ///
    /// @notice Max lvUSD that can be minted for 1 OUSD
    ///
    /// @param ratio new ratio to set as collateral
    function changeCollateralRate(uint256 ratio) external {
        globalCollateralRate = ratio;
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
        console.log("CDP:canDeletePosition:cdp[nft] %s");
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

    function addNFTPositionToTracker(uint256 nftIDToAdd) internal nftIDMustNotExist(nftID) {
        createdNFtPositions[totalEntries] = nftIDToAdd;
        totalEntries += 1;
    }

    function removeNFTPositionFromTracker(uint256 nftIDToRemove) internal nftIDMustExist(nftID) {
        
    }
}
