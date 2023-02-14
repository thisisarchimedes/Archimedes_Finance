// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "hardhat/console.sol";

import {AccessController} from "../AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AccessControllerMock is AccessController, ReentrancyGuard {
    uint256 public someArg;

    function init(uint256 _someArg) external nonReentrant initializer onlyAdmin {
        someArg = _someArg;
    }

    function mockExpectInitialized() external {}

    function mockOnlyAdmin() external onlyAdmin {}

    function mockOnlyExecutive() external onlyExecutive {}

    function mockOnlyGovernor() external onlyGovernor {}

    function mockOnlyGuardian() external onlyGuardian {}
}
