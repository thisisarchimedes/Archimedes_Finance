// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ParameterStore} from "../ParameterStore.sol";

/// @title ParameterStore is a contract for storing global parameters that can be modified by a privileged role
/// @notice This contract (will be) proxy upgradable
contract ParameterStoreMock is ParameterStore {
    function version() public pure virtual returns (string memory) {
        return "V1";
    }
}

contract ParameterStoreMockV2 is ParameterStoreMock {
    function version() public pure virtual override returns (string memory) {
        return "V2";
    }
}
