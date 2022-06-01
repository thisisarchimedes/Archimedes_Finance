// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import {AccessController} from "./AccessController.sol";

/// @title LeverageAllocator
/// @dev Contract that tracks how much lvUSD is available for an address to be allocated
/// @notice This contract (will be) proxy upgradable
contract LeverageAllocator is AccessController {
    mapping(address => uint256) internal _addressToLvUSDAvailable;

    constructor(address admin) AccessController(admin) {}

    function init(address[] calldata addressContracts) external initializer onlyAdmin {}

    /// @dev admin can use to manually override available lvUSD for a given user
    function setAddressToLvUSDAvailable(address addr, uint256 amount) external onlyAdmin returns (uint256) {
        _addressToLvUSDAvailable[addr] = amount;
        return _addressToLvUSDAvailable[addr];
    }

    /// @dev verify the address has requested lvUSD to use and reduce allocation by amount
    function useAvailableLvUSD(address addr, uint256 amount) external nonReentrant returns (uint256) {
        uint256 availableLvUSD = _getAddressToLvUSDAvailable(addr);
        require(availableLvUSD >= amount, "Insufficient lvUSD allocation");
        _addressToLvUSDAvailable[addr] -= amount;
        return _addressToLvUSDAvailable[addr];
    }

    function getAddressToLvUSDAvailable(address addr) external view returns (uint256) {
        return _getAddressToLvUSDAvailable(addr);
    }

    /// @dev get available lvUSD allocated to address
    function _getAddressToLvUSDAvailable(address addr) internal view returns (uint256) {
        return _addressToLvUSDAvailable[addr];
    }
}
