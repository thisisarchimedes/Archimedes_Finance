// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ParameterStore is a contract for storing global parameters that can be modified by a privileged role
/// @notice This contract (will be) proxy upgradable
contract ParameterStore is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    uint256 internal _maxNumberOfCycles = 10;
    uint256 internal _originationFeeRate = 5 ether / 100;
    uint256 internal _globalCollateralRate = 90; // in percentage
    uint256 internal _rebaseFeeRate = 10 ether / 100; // meaning 10%
    address internal _treasuryAddress;
    uint256 internal _curveGuardPercentage = 90; // 90%
    uint256 internal _slippage = 2; // 2%;
    /// example for _archToLevRatio: If each arch is worth 1000 lvUSD, set this to 1000
    uint256 internal _archToLevRatio = 1 ether; // meaning 1 arch is equal 1 lvUSD

    modifier onlyGovernor() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "Caller is not Governor");
        _;
    }

    // constructor(address admin) AccessController(admin) {}

    function init(address treasuryAddress, address admin) external {
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);
        _treasuryAddress = treasuryAddress;
    }

    function changeCurveGuardPercentage(uint256 newCurveGuardPercentage) external onlyGovernor {
        // curveGuardPercentage must be a number between 80 and 100
        require(newCurveGuardPercentage >= 80 && newCurveGuardPercentage <= 100, "New CGP out of range");
        _curveGuardPercentage = newCurveGuardPercentage;
    }

    function changeSlippage(uint256 newSlippage) external onlyGovernor {
        // slippage must be a number between 0 and 5
        require(newSlippage > 0 && newSlippage < 5, "New slippage out of range");
        _slippage = newSlippage;
    }

    function changeTreasuryAddress(address newTreasuryAddress) external onlyGovernor {
        _treasuryAddress = newTreasuryAddress;
    }

    function changeOriginationFeeRate(uint256 newFeeRate) external onlyGovernor {
        _originationFeeRate = newFeeRate;
    }

    function changeGlobalCollateralRate(uint256 newGlobalCollateralRate) external onlyGovernor {
        require(newGlobalCollateralRate <= 100 && newGlobalCollateralRate > 0, "New collateral rate out of range");
        _globalCollateralRate = newGlobalCollateralRate;
    }

    function changeMaxNumberOfCycles(uint256 newMaxNumberOfCycles) external onlyGovernor {
        _maxNumberOfCycles = newMaxNumberOfCycles;
    }

    function changeRebaseFeeRate(uint256 newRebaseFeeRate) external onlyGovernor {
        // rebaseFeeRate must be a number between 1 and 99 (in 18 decimal)
        require(newRebaseFeeRate < (100 ether) && newRebaseFeeRate > (0 ether), "New rebase fee rate out of range");
        _rebaseFeeRate = newRebaseFeeRate;
    }

    function changeArchToLevRatio(uint256 newArchToLevRatio) external onlyGovernor {
        _archToLevRatio = newArchToLevRatio;
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

    function getTreasuryAddress() public view returns (address) {
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
        return (leverageAmount / _archToLevRatio);
    }

    function calculateLeverageAllowedForArch(uint256 archAmount) public view returns (uint256) {
        return (_archToLevRatio * archAmount) / 1 ether;
    }
}
