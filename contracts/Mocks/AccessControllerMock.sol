// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {AccessController} from "../AccessController.sol";

contract AccessControllerMock is AccessController {
    uint256 public someArg;

    constructor(address admin) AccessController(admin) {}

    function init(uint256 _someArg) external nonReentrant initializer onlyAdmin {
        someArg = _someArg;
    }

    function mockExpectInitialized() external expectInitialized {}

    function mockOnlyAdmin() external onlyAdmin {}

    function mockOnlyExecutive() external onlyExecutive {}

    function mockOnlyGovernor() external onlyGovernor {}

    function mockOnlyGuardian() external onlyGuardian {}
}
