// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title OUSD mock token
///
/// @dev This is the contract for the testing OUSD
///
/// TODO: add access control and roles
///
contract OUSDMockToken is ERC20("Mock OUSD", "oUSD") {
    /// @dev Mints tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    ///
    /// @param recipient the account to mint tokens to.
    /// @param amount    the amount of tokens to mint.
    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}
