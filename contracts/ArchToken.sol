// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {AccessController} from "./AccessController.sol";

/// @title Archimedes Token
/// @dev This is the contract for the Archimedes rewards token
contract ArchToken is ERC20, ERC20Burnable, AccessController {
    /// @notice We premint to the _addressTreasury in the constructor when deployed
    constructor(address admin, address _addressTreasury) ERC20("Archimedes Token", "ARCH") AccessController(admin) {
        _mint(_addressTreasury, 100000000 ether);
    }

    function init() external onlyAdmin {}
}
