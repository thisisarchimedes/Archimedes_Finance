// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Archimedes Token
/// @dev This is the contract for the Archimedes rewards token
contract ArchToken is ERC20 {
    constructor() ERC20("Archimedes Token", "ARCH") {
        // premint 1,000,000 tokens to owner
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}
