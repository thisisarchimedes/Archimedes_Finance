// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {BasicAccessController} from "../contracts/BasicAccessController.sol";

/// @title lvUSD token
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
contract LvUSDToken is ERC20("Archimedes dsuvl", "dsuvl"), BasicAccessController {
    address internal _mintingDestination = address(0);

    constructor(address admin) {
        _grantRole(ADMIN_ROLE, _msgSender());
        setMinter(_msgSender());
    }

    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    ///
    /// @param amount the amount of tokens to mint.
    function mint(uint256 amount) external onlyMinter {
        // Only minter can mint
        _mint(_mintingDestination, amount);
    }

    /// @dev change mint address
    /// @param mintDestination new mint destination
    function setMintDestination(address mintDestination) external onlyAdmin {
        _mintingDestination = mintDestination;
    }
}
