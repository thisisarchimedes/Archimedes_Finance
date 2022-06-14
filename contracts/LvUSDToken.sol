// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title lvUSD token
///
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
///
/// TODO: add access control and roles
///
contract LvUSDToken is ERC20("Archimedes lvUSD", "lvUSD"), AccessControl {

    // transfer it
    // has a value
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    // Only role that can change minting destination. Can be the defender timelock user
    bytes32 public constant MINT_DEST_ROLE = keccak256("MINT_DEST_ROLE");

    address internal mintingDestination = address(0);

    constructor(address admin) {
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    ///
    /// @param recipient the account to mint tokens to.
    /// @param amount    the amount of tokens to mint.
    function mint(uint256 amount) external {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(mintingDestination, amount);
    }

    /// @dev Sets the address of the current minter contract
    /// Timelocked function (set candidate and change owner after 17,280 blocks ~3 days)
    /// Emits MinterSet
    ///
    /// @param minter the accounts to set.
    function setMinter(address minter) external {
        _setMinter(minter);
    }

    function setMintDestRole(address minterDestAddress) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _grantRole(MINT_DEST_ROLE, minterDestAddress);
    }

    function setMintDestination(address mintDestination) external {
        require(hasRole(MINT_DEST_ROLE, msg.sender), "Caller is not a MINT_DEST_ROLE");
        mintingDestination = mintDestination;
    }

    /// @dev Sets the address of the current minter contract
    /// Timelocked function (set candidate and change owner after 17,280 blocks ~3 days)
    /// Emits MinterSet
    ///
    /// @param minter the accounts to set.
    function _setMinter(address minter) internal {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _grantRole(MINTER_ROLE, minter);
    }
}
