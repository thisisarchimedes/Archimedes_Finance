// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title lvUSD token
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
contract LvUSDToken is ERC20("Archimedes lvUSD", "lvUSD"), AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address internal _mintingDestination = address(0);

    constructor(address admin) {
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    ///
    /// @param amount    the amount of tokens to mint.
    function mint(uint256 amount) external {
        // Only admin (which is a timelock) can mint
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an Admin");
        _mint(_mintingDestination, amount);
    }

    /// @dev Sets a new admin
    ///
    /// @param newAdmin the accounts to set.
    function setAdmin(address newAdmin) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an Admin");
        _grantRole(ADMIN_ROLE, newAdmin);
        _revokeRole(ADMIN_ROLE, msg.sender);
    }

    /// @dev change mint address
    /// @param mintDestination new mint destination
    function setMintDestination(address mintDestination) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an Admin");
        _mintingDestination = mintDestination;
    }
}
