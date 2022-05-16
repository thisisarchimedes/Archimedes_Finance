// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {AccessController} from "./AccessController.sol";

/// @title LeverageAllocator
/// @dev Contract that tracks how much lvUSD is available for an address to be allocated
/// @notice This contract (will be) proxy upgradable
contract LeverageAllocator is ReentrancyGuard, AccessController {
    mapping(address => uint256) internal _addressToLvUSDAvailable;

    constructor(address admin) AccessController(admin) {}

    /// @dev get available lvUSD allocated to address
    function _getAddressToLvUSDAvailable(address addr) internal view returns (uint256) {
        return _addressToLvUSDAvailable[addr];
    }

    function getAddressToLvUSDAvailable(address addr) external view returns (uint256) {
        return _getAddressToLvUSDAvailable(addr);
    }

    /// @dev admin can use to manually override available lvUSD for a given user
    function setAddressToLvUSDAvailable(address addr, uint256 amount) external onlyAdmin returns (uint256) {
        _addressToLvUSDAvailable[addr] = amount;
        return _addressToLvUSDAvailable[addr];
    }

    /// @dev verify the address has requested lvUSD to use and reduce allocation by amount
    function useAvailableLvUSD(address addr, uint256 amount) external nonReentrant returns (uint256) {
        require(_getAddressToLvUSDAvailable(addr) >= amount, "useAvailableLvUSD: amount is greater than available lvUSD allocation");
        _addressToLvUSDAvailable[addr] -= amount;
        return _addressToLvUSDAvailable[addr];
    }
}
