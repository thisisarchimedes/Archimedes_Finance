// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import {AccessController} from "./AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {VaultOUSD} from "../contracts/VaultOUSD.sol";
import {ParameterStore} from "./ParameterStore.sol";

/// @title CDPosition is ledger contract for all  NFT positions and regular positions
/// @dev CDP creates and destroy NFT and address positions. It keep tracks of how many tokens user has borrowed.
/// It keeps track of how much interest each position accrue
/// @notice CDPosition does not hold any tokens. It is not a vault of any kind.
/// @notice CDP does not emit any events. All related events will be emitted by the calling contract.
/// @notice This contract (will be) proxy upgradable
contract CDPosition is AccessController, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    struct CDP {
        uint256 oUSDPrinciple; // Amount of OUSD originally deposited by user
        uint256 oUSDInterestEarned; // Total interest earned (and rebased) so far
        uint256 oUSDTotalWithoutInterest; // Principle + OUSD acquired from selling borrowed lvUSD + Interest earned
        uint256 lvUSDBorrowed; // Total lvUSD borrowed under this position
        uint256 shares; // Total vault shares allocated to this position
        // // New values, need to implement changing values
        uint256 openTimeStamp; // Open time
        uint256 positionLifetimeInDays; // Position in days
        uint256 positionExpiration;
    }

    mapping(uint256 => CDP) internal _nftCDP;

    address internal _addressVaultOUSD;
    address internal _addressParameterStore;
    VaultOUSD internal _vault;
    ParameterStore internal _parameterStore;

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
        require(_nftCDP[nftID].lvUSDBorrowed == 0, "lvUSD borrowed must be zero");
        _;
    }

    /// @dev add new entry to nftid<>CPP map with ousdPrinciple.
    /// Update both principle and total with OUSDPrinciple
    /// @param nftID newly minted NFT
    /// @param oOUSDPrinciple initial OUSD investment (ie position principle)
    function createPosition(uint256 nftID, uint256 oOUSDPrinciple) external nftIDMustNotExist(nftID) nonReentrant onlyExecutive {
        uint256 blockTimestamp = block.timestamp;
        uint256 positionTimeToLive = _parameterStore.getPositionTimeToLiveInDays();
        uint256 positionEndDate = blockTimestamp + positionTimeToLive * 1 days;
        _nftCDP[nftID] = CDP(oOUSDPrinciple, 0, oOUSDPrinciple, 0, 0, blockTimestamp, positionTimeToLive, positionEndDate);
    }

    /// @dev delete entry in CDP --if-- lvUSD borrowed balance is zero
    ///
    /// @param nftID entry address to delete
    function deletePosition(uint256 nftID) external nftIDMustExist(nftID) canDeletePosition(nftID) nonReentrant onlyExecutive {
        /// Set all values to default. Not way to remove key from mapping in solidity
        delete _nftCDP[nftID];
    }

    /// @dev add shares to a position.
    /// @param nftID NFT position to update
    /// @param shares shares to add
    function addSharesToPosition(uint256 nftID, uint256 shares) external nftIDMustExist(nftID) nonReentrant onlyExecutive {
        _nftCDP[nftID].shares += shares;
    }

    /// @dev remove shares from position.
    /// @param nftID NFT position to update
    /// @param shares shares to remove
    function removeSharesFromPosition(uint256 nftID, uint256 shares) external nftIDMustExist(nftID) nonReentrant onlyExecutive {
        require(_nftCDP[nftID].shares >= shares, "Shares exceed position balance");
        _nftCDP[nftID].shares -= shares;
    }

    /// @dev update borrowed lvUSD in position. This method adds a delta to existing borrowed value
    /// @param nftID NFT position to update
    /// @param lvUSDAmountToBorrow amount to add to position's existing borrowed lvUSD sum
    function borrowLvUSDFromPosition(uint256 nftID, uint256 lvUSDAmountToBorrow) external nftIDMustExist(nftID) nonReentrant onlyExecutive {
        _nftCDP[nftID].lvUSDBorrowed += lvUSDAmountToBorrow;
    }

    /// @dev update borrowed lvUSD in position. This method removed a delta to existing borrowed value
    /// @param nftID NFT position to update
    /// @param lvUSDAmountToRepay amount to remove fom position's existing borrowed lvUSD sum
    function repayLvUSDToPosition(uint256 nftID, uint256 lvUSDAmountToRepay) external nftIDMustExist(nftID) nonReentrant onlyExecutive {
        if (_nftCDP[nftID].lvUSDBorrowed < lvUSDAmountToRepay) {
            // if trying to repay more lvUSDthen expected, zero out lvUSDBorrowed
            _nftCDP[nftID].lvUSDBorrowed = 0;
        } else {
            _nftCDP[nftID].lvUSDBorrowed -= lvUSDAmountToRepay;
        }
    }

    /// @dev update deposited OUSD in position. This method adds a delta to existing deposited value
    /// @param nftID NFT position to update
    /// @param oUSDAmountToDeposit amount to add to position's existing deposited sum
    function depositOUSDtoPosition(uint256 nftID, uint256 oUSDAmountToDeposit) external nftIDMustExist(nftID) nonReentrant onlyExecutive {
        _nftCDP[nftID].oUSDTotalWithoutInterest += oUSDAmountToDeposit;
    }

    /// @dev update deposited OUSD in position. This method removed a delta to existing deposited value
    /// @param nftID NFT position to update
    /// @param oUSDAmountToWithdraw amount to remove to position's existing deposited sum
    function withdrawOUSDFromPosition(uint256 nftID, uint256 oUSDAmountToWithdraw) external nftIDMustExist(nftID) nonReentrant onlyExecutive {
        require(getOUSDTotalIncludeInterest(nftID) >= oUSDAmountToWithdraw, "Insufficient OUSD balance");
        _nftCDP[nftID].oUSDTotalWithoutInterest -= oUSDAmountToWithdraw;
    }

    // * CDP Getters *//
    function getOUSDPrinciple(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].oUSDPrinciple;
    }

    function getOUSDInterestEarned(uint256 nftID) public view nftIDMustExist(nftID) returns (uint256) {
        uint256 sharesOfOwner = _nftCDP[nftID].shares;
        uint256 totalFundsFromPreviewRedeem = _vault.previewRedeem(sharesOfOwner);
        if (_nftCDP[nftID].oUSDTotalWithoutInterest > totalFundsFromPreviewRedeem) {
            revert("InterestEarned calc error");
        }
        return totalFundsFromPreviewRedeem - _nftCDP[nftID].oUSDTotalWithoutInterest;
    }

    function getOUSDTotalIncludeInterest(uint256 nftID) public view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].oUSDTotalWithoutInterest + getOUSDInterestEarned(nftID);
    }

    function getOUSDTotalWithoutInterest(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].oUSDTotalWithoutInterest;
    }

    function getLvUSDBorrowed(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].lvUSDBorrowed;
    }

    function getShares(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].shares;
    }

    function getPositionTimeOpened(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].openTimeStamp; // Open time
    }

    function getPositionTimeToLive(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].positionLifetimeInDays; // Position in days
    }

    function getPositionExpireTime(uint256 nftID) external view nftIDMustExist(nftID) returns (uint256) {
        return _nftCDP[nftID].positionExpiration;
    }

    function initialize() public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    function setDependencies(address addressVaultOUSD, address addressParameterStore) external nonReentrant onlyAdmin {
        _addressVaultOUSD = addressVaultOUSD;
        _addressParameterStore = addressParameterStore;
        _vault = VaultOUSD(_addressVaultOUSD);
        _parameterStore = ParameterStore(addressParameterStore);
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }
}
