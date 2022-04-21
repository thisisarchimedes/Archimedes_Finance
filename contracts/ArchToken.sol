// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title Archimedes Token
/// @dev This is the contract for the Archimedes rewards token
contract ArchToken is ERC20 {
    /// @notice We premint to the _addressTreasury in the constructor when deployed
    constructor(address _addressTreasury) ERC20("Archimedes Token", "ARCH") {
        _mint(_addressTreasury, 100000000 ether);
    }
}
