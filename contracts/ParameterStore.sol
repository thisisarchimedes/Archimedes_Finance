// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import {AccessController} from "./AccessController.sol";

/// @title ParameterStore is a contract for storing global parameters that can be modified by a privileged role
/// @notice This contract (will be) proxy upgradable
contract ParameterStore is AccessController {
    uint256 internal _maxNumberOfCycles = 10;
    uint256 internal _originationFeeRate = 5 ether / 100;
    uint256 internal _globalCollateralRate = 90; // in percentage
    uint256 internal _rebaseFeeRate = 10 ether / 100; // meaning 10%
    address internal _treasuryAddress;

    constructor(address admin) AccessController(admin) {}

    function init(address treasuryAddress) external onlyAdmin {
        _treasuryAddress = treasuryAddress;
        super._init();
    }

    function getMaxNumberOfCycles() external view returns (uint256) {
        return _maxNumberOfCycles;
    }

    function getOriginationFeeRate() external view returns (uint256) {
        return _originationFeeRate;
    }

    function getGlobalCollateralRate() external view returns (uint256) {
        return _globalCollateralRate;
    }

    function getTreasuryAddress() public view returns (address) {
        return _treasuryAddress;
    }

    function changeTreasuryAddress(address newTreasuryAddress) external {
        _treasuryAddress = newTreasuryAddress;
    }

    function changeOriginationFeeRate(uint256 newFeeRate) external {
        _originationFeeRate = newFeeRate;
    }

    function changeGlobalCollateralRate(uint256 _newGlobalCollateralRate) external {
        require(_newGlobalCollateralRate <= 100 && _newGlobalCollateralRate > 0, "_globalCollateralRate must be a number between 1 and 100");
        _globalCollateralRate = _newGlobalCollateralRate;
    }

    function changeMaxNumberOfCycles(uint256 _newMaxNumberOfCycles) external {
        _maxNumberOfCycles = _newMaxNumberOfCycles;
    }

    function getRebaseFeeRate() external view returns (uint256) {
        return _rebaseFeeRate;
    }

    function changeRebaseFeeRate(uint256 _newRebaseFeeRate) external {
        require(_newRebaseFeeRate < (100 ether) && _newRebaseFeeRate > (0 ether), "rebaseFeeRate must be a number between 1 and 99 (in 18 decimal)");
        _rebaseFeeRate = _newRebaseFeeRate;
    }

    /// Method returns the allowed leverage for principle and number of cycles
    /// Return value does not include principle!
    /// must be public as we need to access it in contract
    function getAllowedLeverageForPosition(uint256 principle, uint256 numberOfCycles) public view returns (uint256) {
        require(numberOfCycles <= _maxNumberOfCycles, "Number of cycles must be lower then allowed max");
        uint256 leverageAmount = 0;
        uint256 cyclePrinciple = principle;
        for (uint256 i = 0; i < numberOfCycles; i++) {
            cyclePrinciple = (cyclePrinciple * _globalCollateralRate) / 100;
            leverageAmount += cyclePrinciple;
        }
        return leverageAmount;
    }

    function calculateOriginationFee(uint256 leverageAmount) public view returns (uint256) {
        return (_originationFeeRate * leverageAmount) / 1 ether;
    }
}
