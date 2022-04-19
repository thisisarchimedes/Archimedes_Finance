// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Archimedes Token
/// @dev This is the contract for the Archimedes rewards token
contract ArchToken is ERC20 {
    // TODO set treasury address
    address addressTreasury = msg.sender;

    constructor() ERC20("Archimedes Token", "ARCH") {
        // premint 100,000,000 tokens to owner
        _mint(addressTreasury, 100000000 ether);
    }
}
