// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessController} from "./AccessController.sol";

/// @title lvUSD token
///
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
///
/// TODO: add access control and roles
///
contract LvUSDToken is ERC20("Archimedes lvUSD", "lvUSD"), AccessController {
    constructor(address admin) AccessController(admin) {}

    function init(address[] calldata addressContracts) external initializer onlyAdmin {}

    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    ///
    /// @param recipient the account to mint tokens to.
    /// @param amount    the amount of tokens to mint.
    function mint(address recipient, uint256 amount) external nonReentrant {
        _mint(recipient, amount);
    }

    /// @dev Sets the address of the current minter contract
    /// Timelocked function (set candidate and change owner after 17,280 blocks ~3 days)
    /// Emits MinterSet
    ///
    /// @param accounts the accounts to set.
    function setMinter(address[] calldata accounts) external nonReentrant {
        _setMinter(accounts);
    }

    /// @dev Sets the address of the current minter contract
    /// Timelocked function (set candidate and change owner after 17,280 blocks ~3 days)
    /// Emits MinterSet
    ///
    /// @param accounts the accounts to set.
    function _setMinter(address[] calldata accounts) internal {}
}
