// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";
import {AccessController} from "./AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IAuction} from "./interfaces/IAuction.sol";

/// @title ParameterStore is a contract for storing global parameters that can be modified by a privileged role
/// @notice This contract (will be) proxy upgradable
contract ParameterStore is AccessController, UUPSUpgradeable {
    address internal _addressCoordinator;
    address internal _addressExchanger;

    IAuction internal _auction;

    uint256 internal _maxNumberOfCycles; // regular natural number
    uint256 internal _originationFeeRate; // in ether percentage (see initialize for examples)
    uint256 internal _globalCollateralRate; // in percentage
    uint256 internal _rebaseFeeRate; // in ether percentage (see initialize for examples)
    address internal _treasuryAddress;
    uint256 internal _curveGuardPercentage; // in regular (0-100) percentages
    uint256 internal _slippage; // in regular (0-100) percentages
    // maximum allowed "extra" tokens when exchanging
    uint256 internal _curveMaxExchangeGuard;
    uint256 internal _minPositionCollateral;
    uint256 internal _positionTimeToLiveInDays;
    uint256 internal _coordinatorLeverageBalance;

    event ParameterChange(string indexed _name, uint256 _newValue, uint256 _oldValue);
    event TreasuryChange(address indexed _newValue, address indexed _oldValue);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());

        _maxNumberOfCycles = 10;
        _originationFeeRate = 5 ether / 1000; // meaning 0.5%
        _globalCollateralRate = 95;
        _rebaseFeeRate = 30 ether / 100; // meaning 30%
        _curveGuardPercentage = 96;
        _slippage = 1; // 1%;
        _curveMaxExchangeGuard = 2; // meaning we allow exchange with get 50% more then we expected
        _minPositionCollateral = 2 ether;
        _positionTimeToLiveInDays = 369;
        _coordinatorLeverageBalance = 0;

        _treasuryAddress = address(0);
        _addressCoordinator = address(0);
        _addressExchanger = address(0);
    }

    function setDependencies(
        address addressCoordinator,
        address addressExchanger,
        address addressAuction
    ) external onlyAdmin {
        require(addressCoordinator != address(0), "cant set to 0 A");
        require(addressExchanger != address(0), "cant set to 0 A");
        require(addressAuction != address(0), "cant set to 0 A");

        _addressCoordinator = addressCoordinator;
        _addressExchanger = addressExchanger;
        _auction = IAuction(addressAuction);
    }

    modifier onlyInternalContracts() {
        require(msg.sender == _addressCoordinator || msg.sender == _addressExchanger, "Caller is not internal contract");
        _;
    }

    /* Privileged functions */

    function changeCoordinatorLeverageBalance(uint256 newCoordinatorLeverageBalance) external onlyInternalContracts {
        // No checks that I can think of. Seems convoluted to add a check for lvUSD balance as we "trust" internal contracts to check lvUSD
        // balance when needed.
        _coordinatorLeverageBalance = newCoordinatorLeverageBalance;
    }

    function changeCurveGuardPercentage(uint256 newCurveGuardPercentage) external onlyGovernor {
        // curveGuardPercentage must be a number between 80 and 100
        require(newCurveGuardPercentage >= 80 && newCurveGuardPercentage <= 100, "New CGP out of range");
        emit ParameterChange("curveGuardPercentage", newCurveGuardPercentage, _curveGuardPercentage);
        _curveGuardPercentage = newCurveGuardPercentage;
    }

    function changeSlippage(uint256 newSlippage) external onlyGovernor {
        // slippage must be a number between 0 and 5
        require(newSlippage != 0 && newSlippage < 5, "New slippage out of range");
        emit ParameterChange("slippage", newSlippage, _slippage);
        _slippage = newSlippage;
    }

    function changeTreasuryAddress(address newTreasuryAddress) external onlyGovernor {
        require(newTreasuryAddress != address(0), "Treasury can't be set to 0");
        emit TreasuryChange(newTreasuryAddress, _treasuryAddress);
        _treasuryAddress = newTreasuryAddress;
    }

    function changeOriginationFeeRate(uint256 newFeeRate) external onlyGovernor {
        // require(newFeeRate > (1 ether / 1000) && newFeeRate < (50 ether / 1000), "newFeeRate out of range");
        emit ParameterChange("originationFeeRate", newFeeRate, _originationFeeRate);
        _originationFeeRate = newFeeRate;
    }

    function changeGlobalCollateralRate(uint256 newGlobalCollateralRate) external onlyGovernor {
        require(newGlobalCollateralRate <= 100 && newGlobalCollateralRate != 0, "New collateral rate out of range");
        emit ParameterChange("globalCollateralRate", newGlobalCollateralRate, _globalCollateralRate);
        _globalCollateralRate = newGlobalCollateralRate;
    }

    function changeMaxNumberOfCycles(uint256 newMaxNumberOfCycles) external onlyGovernor {
        require(newMaxNumberOfCycles < 20 && newMaxNumberOfCycles != 0, "New max n of cycles out of range");
        emit ParameterChange("maxNumberOfCycles", newMaxNumberOfCycles, _maxNumberOfCycles);
        _maxNumberOfCycles = newMaxNumberOfCycles;
    }

    function changeRebaseFeeRate(uint256 newRebaseFeeRate) external onlyGovernor {
        // rebaseFeeRate must be a number between 1 and 99 (in 18 decimal)
        require(newRebaseFeeRate < (100 ether) && newRebaseFeeRate > (0 ether), "New rebase fee rate out of range");
        emit ParameterChange("rebaseFeeRate", newRebaseFeeRate, _rebaseFeeRate);
        _rebaseFeeRate = newRebaseFeeRate;
    }

    function changeCurveMaxExchangeGuard(uint256 newCurveMaxExchangeGuard) external onlyGovernor {
        require(newCurveMaxExchangeGuard < 100 && newCurveMaxExchangeGuard > 1, "newCurveMaxExGuard out of range");
        emit ParameterChange("curveMaxExchangeGuard", newCurveMaxExchangeGuard, _curveMaxExchangeGuard);
        _curveMaxExchangeGuard = newCurveMaxExchangeGuard;
    }

    function changeMinPositionCollateral(uint256 newMinPositionCollateral) external onlyGovernor {
        require(newMinPositionCollateral < (1000000 ether) && newMinPositionCollateral > (1 ether), "New min collateral out of range");
        emit ParameterChange("minPositionCollateral", newMinPositionCollateral, _minPositionCollateral);
        _minPositionCollateral = newMinPositionCollateral;
    }

    function changePositionTimeToLiveInDays(uint256 newPositionTimeToLiveInDays) external onlyGovernor {
        require(newPositionTimeToLiveInDays < 10000 && newPositionTimeToLiveInDays > 30, "newPositionTimeToLiveInDays OOR");
        emit ParameterChange("newPositionTimeToLiveInDays", newPositionTimeToLiveInDays, _positionTimeToLiveInDays);
        _positionTimeToLiveInDays = newPositionTimeToLiveInDays;
    }

    function getCoordinatorLeverageBalance() external view returns (uint256) {
        return _coordinatorLeverageBalance;
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

    function getTreasuryAddress() external view returns (address) {
        require(_treasuryAddress != address(0), "Treasury address is not set");
        return _treasuryAddress;
    }

    function getCurveGuardPercentage() external view returns (uint256) {
        return _curveGuardPercentage;
    }

    function getSlippage() external view returns (uint256) {
        return _slippage;
    }

    function getArchToLevRatio() public view returns (uint256) {
        return _auction.getCurrentBiddingPrice();
    }

    function getMinPositionCollateral() external view returns (uint256) {
        return _minPositionCollateral;
    }

    function getPositionTimeToLiveInDays() external view returns (uint256) {
        return _positionTimeToLiveInDays;
    }

    /// Method returns the allowed leverage for principle and number of cycles
    /// Return value does not include principle!
    /// must be public as we need to access it in contract
    function getAllowedLeverageForPosition(uint256 principle, uint256 numberOfCycles) public view returns (uint256) {
        require(numberOfCycles <= _maxNumberOfCycles, "Cycles greater than max allowed");
        uint256 leverageAmount = 0;
        uint256 cyclePrinciple = principle;
        // console.log("getAllowedLeverageForPosition principle %s, numberOfCycles %s", principle / 1 ether, numberOfCycles);
        for (uint256 i = 0; i < numberOfCycles; ++i) {
            // console.log("getAllowedLeverageForPosition looping on cycles");
            cyclePrinciple = (cyclePrinciple * _globalCollateralRate) / 100;
            leverageAmount += cyclePrinciple;
        }
        // console.log("getAllowedLeverageForPosition: leverageAmount %s", leverageAmount / 1 ether);
        return leverageAmount;
    }

    function getAllowedLeverageForPositionWithArch(
        uint256 principle,
        uint256 numberOfCycles,
        uint256 archAmount
    ) external view returns (uint256) {
        uint256 allowedLeverageNoArchLimit = getAllowedLeverageForPosition(principle, numberOfCycles);
        uint256 allowedLeverageWithGivenArch = calculateLeverageAllowedForArch(archAmount);
        if (allowedLeverageWithGivenArch / 10000 >= allowedLeverageNoArchLimit / 10000) {
            // In this case, user approved more(or exactly) arch tokens needed for leverage
            return allowedLeverageNoArchLimit;
        } else {
            /// TODO : Should this return a revert? Most likely but other changes are needed as well. This can be misleading
            revert("Not enough Arch for Pos");
        }
    }

    function calculateOriginationFee(uint256 leverageAmount) external view returns (uint256) {
        return (_originationFeeRate * leverageAmount) / 1 ether;
    }

    function calculateArchNeededForLeverage(uint256 leverageAmount) external view returns (uint256) {
        /// This method add a bit more Arch then is needed to get around integer rounding
        uint256 naturalNumberRatio = getArchToLevRatio() / 1 ether;
        return (leverageAmount / naturalNumberRatio) + 1000;
    }

    function calculateLeverageAllowedForArch(uint256 archAmount) public view returns (uint256) {
        return (getArchToLevRatio() / 1 ether) * archAmount;
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    fallback() external {
        revert("ParamStore : Invalid access");
    }
}
