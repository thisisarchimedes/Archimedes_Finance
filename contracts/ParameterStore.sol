// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import {AccessController} from "./AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title ParameterStore is a contract for storing global parameters that can be modified by a privileged role
/// @notice This contract (will be) proxy upgradable
contract ParameterStore is AccessController, UUPSUpgradeable {
    uint256 internal _maxNumberOfCycles; // regular natural number
    uint256 internal _originationFeeRate; // in ether percentage (see initialize for examples)
    uint256 internal _globalCollateralRate; // in percentage
    uint256 internal _rebaseFeeRate; // in ether percentage (see initialize for examples)
    address internal _treasuryAddress;
    uint256 internal _curveGuardPercentage; // in regular (0-100) percentages
    uint256 internal _slippage; // in regular (0-100) percentages
    /// example for _archToLevRatio: If each arch is worth 1000 lvUSD, set this to 1000
    uint256 internal _archToLevRatio;
    // maximum allowed "extra" tokens when exchanging
    uint256 internal _curveMaxExchangeGuard;

    event ParameterChange(string indexed _name, uint256 _newValue, uint256 _oldValue);
    event TreasuryChange(address indexed _newValue, address indexed _oldValue);

    function initialize() public initializer {
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());

        _maxNumberOfCycles = 10;
        _originationFeeRate = 5 ether / 100;
        _globalCollateralRate = 90;
        _rebaseFeeRate = 10 ether / 100; // meaning 10%
        _treasuryAddress;
        _curveGuardPercentage = 90;
        _slippage = 2; // 2%;
        _archToLevRatio = 1 ether; // meaning 1 arch is equal 1 lvUSD
        _curveMaxExchangeGuard = 50; // meaning we allow exchange with get 50% more then we expected
        _treasuryAddress = address(0);
    }

    function changeCurveGuardPercentage(uint256 newCurveGuardPercentage) external onlyGovernor {
        // curveGuardPercentage must be a number between 80 and 100
        require(newCurveGuardPercentage >= 80 && newCurveGuardPercentage <= 100, "New CGP out of range");
        emit ParameterChange("curveGuardPercentage", newCurveGuardPercentage, _curveGuardPercentage);
        _curveGuardPercentage = newCurveGuardPercentage;
    }

    function changeSlippage(uint256 newSlippage) external onlyGovernor {
        // slippage must be a number between 0 and 5
        require(newSlippage > 0 && newSlippage < 5, "New slippage out of range");
        emit ParameterChange("slippage", newSlippage, _slippage);
        _slippage = newSlippage;
    }

    function changeTreasuryAddress(address newTreasuryAddress) external onlyGovernor {
        require(newTreasuryAddress != address(0), "Treasury can't be set to 0");
        emit TreasuryChange(newTreasuryAddress, _treasuryAddress);
        _treasuryAddress = newTreasuryAddress;
    }

    function changeOriginationFeeRate(uint256 newFeeRate) external onlyGovernor {
        emit ParameterChange("originationFeeRate", newFeeRate, _originationFeeRate);
        _originationFeeRate = newFeeRate;
    }

    function changeGlobalCollateralRate(uint256 newGlobalCollateralRate) external onlyGovernor {
        require(newGlobalCollateralRate <= 100 && newGlobalCollateralRate > 0, "New collateral rate out of range");
        emit ParameterChange("globalCollateralRate", newGlobalCollateralRate, _globalCollateralRate);
        _globalCollateralRate = newGlobalCollateralRate;
    }

    function changeMaxNumberOfCycles(uint256 newMaxNumberOfCycles) external onlyGovernor {
        emit ParameterChange("maxNumberOfCycles", newMaxNumberOfCycles, _maxNumberOfCycles);
        _maxNumberOfCycles = newMaxNumberOfCycles;
    }

    function changeRebaseFeeRate(uint256 newRebaseFeeRate) external onlyGovernor {
        // rebaseFeeRate must be a number between 1 and 99 (in 18 decimal)
        require(newRebaseFeeRate < (100 ether) && newRebaseFeeRate > (0 ether), "New rebase fee rate out of range");
        emit ParameterChange("rebaseFeeRate", newRebaseFeeRate, _rebaseFeeRate);
        _rebaseFeeRate = newRebaseFeeRate;
    }

    function changeArchToLevRatio(uint256 newArchToLevRatio) external onlyGovernor {
        emit ParameterChange("archToLevRatio", newArchToLevRatio, _archToLevRatio);
        _archToLevRatio = newArchToLevRatio;
    }

    function changeCurveMaxExchangeGuard(uint256 newCurveMaxExchangeGuard) external onlyGovernor {
        emit ParameterChange("curveMaxExchangeGuard", newCurveMaxExchangeGuard, _curveMaxExchangeGuard);
        _curveMaxExchangeGuard = newCurveMaxExchangeGuard;
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

    function getRebaseFeeRate() external view returns (uint256) {
        return _rebaseFeeRate;
    }

    function getCurveMaxExchangeGuard() external view returns (uint256) {
        return _curveMaxExchangeGuard;
    }

    function getTreasuryAddress() public view returns (address) {
        require(_treasuryAddress != address(0), "Treasury address is not set");
        return _treasuryAddress;
    }

    function getCurveGuardPercentage() public view returns (uint256) {
        return _curveGuardPercentage;
    }

    function getSlippage() public view returns (uint256) {
        return _slippage;
    }

    function getArchToLevRatio() public view returns (uint256) {
        return _archToLevRatio;
    }

    /// Method returns the allowed leverage for principle and number of cycles
    /// Return value does not include principle!
    /// must be public as we need to access it in contract
    function getAllowedLeverageForPosition(uint256 principle, uint256 numberOfCycles) public view returns (uint256) {
        require(numberOfCycles <= _maxNumberOfCycles, "Cycles greater than max allowed");
        uint256 leverageAmount = 0;
        uint256 cyclePrinciple = principle;
        for (uint256 i = 0; i < numberOfCycles; i++) {
            cyclePrinciple = (cyclePrinciple * _globalCollateralRate) / 100;
            leverageAmount += cyclePrinciple;
        }
        return leverageAmount;
    }

    function getAllowedLeverageForPositionWithArch(
        uint256 principle,
        uint256 numberOfCycles,
        uint256 archAmount
    ) public view returns (uint256) {
        uint256 allowedLeverageNoArchLimit = getAllowedLeverageForPosition(principle, numberOfCycles);
        uint256 allowedLeverageWithGivenArch = calculateLeverageAllowedForArch(archAmount);
        if (allowedLeverageWithGivenArch >= allowedLeverageNoArchLimit) {
            // In this case, user is burning more(or exactly) arch tokens needed for leverage
            return allowedLeverageNoArchLimit;
        } else {
            // user did not burn enough arch tokens,
            // send the max amount of leverage based on how much arch was burned
            return allowedLeverageWithGivenArch;
        }
    }

    function calculateOriginationFee(uint256 leverageAmount) public view returns (uint256) {
        return (_originationFeeRate * leverageAmount) / 1 ether;
    }

    function calculateArchNeededForLeverage(uint256 leverageAmount) public view returns (uint256) {
        return (leverageAmount / _archToLevRatio) * 1 ether;
    }

    function calculateLeverageAllowedForArch(uint256 archAmount) public view returns (uint256) {
        return (_archToLevRatio * archAmount) / 1 ether;
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    fallback() external {
        revert("PositionToken : Invalid access");
    }
}
