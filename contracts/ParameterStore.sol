// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

/// @title ParameterStore is a contract for storing global parameters that can be modified by a privileged role
/// @notice This contract (will be) proxy upgradable
contract ParameterStore {
    uint256 internal _maxNumberOfCycles = 10;

    constructor() {}

    function getMaxNumberOfCycles() external view returns (uint256) {
        return _maxNumberOfCycles;
    }
}
