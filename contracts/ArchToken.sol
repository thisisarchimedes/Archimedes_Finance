// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Archimedes Token
/// @dev This is the contract for the Archimedes rewards token
contract ArchToken is ERC20 {
    
    constructor() ERC20("Archimedes Token", "ARCH") {}

    /// @notice Mints tokens to a recipient.
    /// @param to the account to mint tokens to.
    /// @param amount the amount of tokens to mint.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
