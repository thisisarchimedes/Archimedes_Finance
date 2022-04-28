// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "../contracts/interfaces/IERC4626.sol";
import {ERC4626} from "../contracts/standard/ERC4626.sol";

/// @title Archimedes OUSD vault
/// @notice Vault holds OUSD managed by Archimedes under all positions.
/// @notice It Uses ER4626 to mint shares for deposited OUSD.
contract VaultOUSD is ERC4626 {
    constructor(
        IERC20Metadata asset,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) ERC4626(asset) {}
}
