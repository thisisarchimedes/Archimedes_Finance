// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IExchanger} from "./interfaces/IExchanger.sol";
import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {AccessController} from "./AccessController.sol";
import "hardhat/console.sol";

/// TODO Approval & Allownace should NOT BE MAX VALUES for pools
/// Use the overloaded function with TO parameter for exchange

/// @title Exchanger
/// @dev is in charge of interacting with the CurveFi pools
contract Exchanger is IExchanger, AccessController {
    using SafeERC20 for IERC20;

    address internal _addressParameterStore;
    address internal _addressCoordinator;
    address internal _addressLvUSD;
    address internal _addressOUSD;
    address internal _address3CRV;
    address internal _addressPoolLvUSD3CRV;
    address internal _addressPoolOUSD3CRV;
    IERC20 internal _lvusd;
    IERC20 internal _ousd;
    IERC20 internal _crv3;
    ICurveFiCurve internal _poolLvUSD3CRV;
    ICurveFiCurve internal _poolOUSD3CRV;

    ParameterStore internal _paramStore;
    int128 internal _indexLvUSD = 0;
    int128 internal _indexOUSD = 0;
    int128 internal _index3CRV = 1;

    uint256 internal _slippage;

    /** @dev curve stable metapools provide 1:1 swaps
     * if the pools are very bent, this is a protection for users
     * TODO: user should be able to override and force a trade
     * @dev expressed as a percentage
     * 100 would require a perfect 1:1 swap
     * 90 allows at most, 1:.9 swaps
     */
    uint256 internal _curveGuardPercentage;

    constructor(address admin) AccessController(admin) {}

    /**
     * @dev initialize Exchanger
     * @param addressContracts contract addresses
     */
    function init(address[] calldata addressContracts) external initializer onlyAdmin {
        // Set variables
        _addressParameterStore = addressContracts[0];
        _addressCoordinator = addressContracts[1];
        _addressLvUSD = addressContracts[2];
        _addressOUSD = addressContracts[3];
        _address3CRV = addressContracts[4];
        _addressPoolLvUSD3CRV = addressContracts[5];
        _addressPoolOUSD3CRV = addressContracts[6];

        // Load contracts
        _paramStore = ParameterStore(_addressParameterStore);
        _lvusd = IERC20(_addressLvUSD);
        _ousd = IERC20(_addressOUSD);
        _crv3 = IERC20(_address3CRV);
        _poolLvUSD3CRV = ICurveFiCurve(_addressPoolLvUSD3CRV);
        _poolOUSD3CRV = ICurveFiCurve(_addressPoolOUSD3CRV);

        _curveGuardPercentage = 90; // 90%
        _slippage = 2; // 2%
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * @param amountLvUSD amount of LvUSD we will put in
     * @return amountOUSD amount of OUSD returned from exchange
     * - MUST emit an event
     * NOTE: There is no guarantee of a 1:1 exchange ratio, but should be close
     * Minimum is 90% * 90%  / _curveGuardPercentage * _curveGuardPercentage
     */
    function swapLvUSDforOUSD(uint256 amountLvUSD) external returns (uint256 amountOUSD) {
        uint256 _returned3CRV = _xLvUSDfor3CRV(amountLvUSD);
        uint256 _returnedOUSD = _x3CRVforOUSD(_returned3CRV);
        _ousd.safeTransfer(_addressCoordinator, _returnedOUSD);
        return _returnedOUSD;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * returns amount of LvUSD
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * @param amountOUSD amount of OUSD we have available to exchange
     * @param minRequiredLvUSD amount of OUSD we must get back or revert
     * @return lvUSDReturned amount of LvUSD we got back
     * NOTE: lvUSDReturned isnt necessarily minRequiredLvUSD - it
     * will be at least that much based on pool price variations
     * @return remainingOUSD amount of left over OUSD after the exchange
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     * @dev OUSD funds are already under Exchanger address, if called by Coordinator
     */
    function swapOUSDforLvUSD(uint256 amountOUSD, uint256 minRequiredLvUSD) external returns (uint256 lvUSDReturned, uint256 remainingOUSD) {
        // Estimate "neededOUSD" using get_dy()
        uint256 _needed3CRV = _poolLvUSD3CRV.get_dy(_indexLvUSD, _index3CRV, minRequiredLvUSD);
        uint256 _neededOUSD = _poolOUSD3CRV.get_dy(_index3CRV, _indexOUSD, _needed3CRV);
        uint256 _neededOUSDWithSlippage = (_neededOUSD * 101) / 100;

        require(amountOUSD >= _neededOUSDWithSlippage, "Not enough OUSD for exchange");

        // We lose some $ from fees and slippage
        // multiply _neededOUSD * 103%
        uint256 _returned3CRV = _xOUSDfor3CRV(_neededOUSDWithSlippage);

        uint256 _returnedLvUSD = _x3CRVforLvUSD(_returned3CRV);
        require(_returnedLvUSD >= minRequiredLvUSD, "Not enough LvUSD in pool");

        // calculate remaining OUSD
        remainingOUSD = amountOUSD - _neededOUSDWithSlippage;
        _ousd.safeTransfer(_addressCoordinator, remainingOUSD);

        // send all swapped lvUSD to coordinator
        _lvusd.safeTransfer(_addressCoordinator, _returnedLvUSD);

        return (_returnedLvUSD, remainingOUSD);
    }

    function xLvUSDfor3CRV(uint256 amountLvUSD) external returns (uint256) {
        return _xLvUSDfor3CRV(amountLvUSD);
    }

    function x3CRVforOUSD(uint256 amount3CRV) external returns (uint256) {
        return _x3CRVforOUSD(amount3CRV);
    }

    function xOUSDfor3CRV(uint256 amountOUSD) external returns (uint256) {
        return _xOUSDfor3CRV(amountOUSD);
    }

    function x3CRVforLvUSD(uint256 amount3CRV) external returns (uint256) {
        return _x3CRVforLvUSD(amount3CRV);
    }

    /**
     * @dev Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amountOUSD amount of OUSD to put into the pool
     * @return amount3CRV amount of 3CRV returned from exchange
     */
    function _xOUSDfor3CRV(uint256 amountOUSD) internal returns (uint256 amount3CRV) {
        /**
         * @param _expected3CRV uses get_dy() to estimate amount the exchange will give us
         * @param _minimum3CRV mimimum accounting for slippage. (_expected3CRV * slippage)
         * @param _returned3CRV amount we actually get from the pool
         * @param _guard3CRV sanity check to protect user
         */
        uint256 _expected3CRV;
        uint256 _minimum3CRV;
        uint256 _returned3CRV;
        uint256 _guard3CRV = (amountOUSD * _curveGuardPercentage) / 100;

        // Verify Exchanger has enough OUSD to use
        require(amountOUSD <= _ousd.balanceOf(address(this)), "Insufficient OUSD in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expected3CRV = _poolOUSD3CRV.get_dy(0, 1, amountOUSD);

        // Set minimum required accounting for slippage
        _minimum3CRV = (_expected3CRV * (100 - _slippage)) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        require(_minimum3CRV >= _guard3CRV, "OUSD pool too imbalanced.");

        // Increase allowance
        _ousd.safeIncreaseAllowance(address(_poolOUSD3CRV), amountOUSD);

        // Exchange OUSD for 3CRV:
        _returned3CRV = _poolOUSD3CRV.exchange(0, 1, amountOUSD, _minimum3CRV);

        // Set approval to zero for safety
        _ousd.safeApprove(address(_poolOUSD3CRV), 0);

        return _returned3CRV;
    }

    /**
     * @dev Exchange using the CurveFi LvUSD/3CRV Metapool
     * @param amount3CRV amount of 3CRV to exchange
     * @return amountLvUSD amount of LvUSD returned from exchange
     */
    function _x3CRVforLvUSD(uint256 amount3CRV) internal returns (uint256 amountLvUSD) {
        /**
         * @param _expectedLvUSD uses get_dy() to estimate amount the exchange will give us
         * @param _minimumLvUSD mimimum accounting for slippage. (_expectedLvUSD * slippage)
         * @param _returnedLvUSD amount we actually get from the pool
         * @param _guardLvUSD sanity check to protect user
         */
        uint256 _expectedLvUSD;
        uint256 _minimumLvUSD;
        uint256 _returnedLvUSD;
        uint256 _guardLvUSD = (amount3CRV * _curveGuardPercentage) / 100;

        // Verify Exchanger has enough 3CRV to use
        require(amount3CRV <= _crv3.balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expectedLvUSD = _poolLvUSD3CRV.get_dy(1, 0, amount3CRV);

        // Set minimum required accounting for slippage
        _minimumLvUSD = (_expectedLvUSD * (100 - _slippage)) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        require(_minimumLvUSD >= _guardLvUSD, "LvUSD pool too imbalanced.");

        // Increase allowance
        _crv3.safeIncreaseAllowance(address(_poolLvUSD3CRV), amount3CRV);

        // Exchange 3CRV for LvUSD:
        _returnedLvUSD = _poolLvUSD3CRV.exchange(1, 0, amount3CRV, _minimumLvUSD);

        // Set approval to zero for safety
        _crv3.safeApprove(address(_poolLvUSD3CRV), 0);

        return _returnedLvUSD;
    }

    /**
     * @dev Exchange using the CurveFi LvUSD/3CRV Metapool
     * @param amountLvUSD amount of LvUSD to exchange
     * @return amount3CRV amount of 3CRV returned from exchange
     */
    function _xLvUSDfor3CRV(uint256 amountLvUSD) internal returns (uint256 amount3CRV) {
        /**
         * @param _expected3CRV uses get_dy() to estimate amount the exchange will give us
         * @param _minimum3CRV mimimum accounting for slippage. (_expected3CRV * slippage)
         * @param _returned3CRV amount we actually get from the pool
         * @param _guard3CRV sanity check to protect user
         */
        uint256 _expected3CRV;
        uint256 _minimum3CRV;
        uint256 _returned3CRV;
        uint256 _guard3CRV = (amountLvUSD * _curveGuardPercentage) / 100;

        // Verify Exchanger has enough LvUSD to use
        require(amountLvUSD <= _lvusd.balanceOf(address(this)), "Insufficient LvUSD in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expected3CRV = _poolLvUSD3CRV.get_dy(0, 1, amountLvUSD);

        // Set minimum required accounting for slippage
        _minimum3CRV = (_expected3CRV * (100 - _slippage)) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        require(_minimum3CRV >= _guard3CRV, "LvUSD pool too imbalanced.");

        // Increase allowance
        _lvusd.safeIncreaseAllowance(address(_poolLvUSD3CRV), amountLvUSD);

        // Exchange LvUSD for 3CRV:
        _returned3CRV = _poolLvUSD3CRV.exchange(0, 1, amountLvUSD, _minimum3CRV);

        // Set approval to zero for safety
        _lvusd.safeApprove(address(_poolLvUSD3CRV), 0);

        return _returned3CRV;
    }

    /**
     * @dev Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amount3CRV amount of LvUSD to exchange
     * @return amountOUSD amount returned from exchange
     */
    function _x3CRVforOUSD(uint256 amount3CRV) internal returns (uint256 amountOUSD) {
        /**
         * @param _expectedOUSD uses get_dy() to estimate amount the exchange will give us
         * @param _minimumOUSD mimimum accounting for slippage. (_expectedOUSD * slippage)
         * @param _returnedOUSD amount we actually get from the pool
         * @param _guardOUSD sanity check to protect user
         */
        uint256 _expectedOUSD;
        uint256 _minimumOUSD;
        uint256 _returnedOUSD;
        uint256 _guardOUSD = (amount3CRV * _curveGuardPercentage) / 100;

        // Verify Exchanger has enough 3CRV to use
        require(amount3CRV <= _crv3.balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expectedOUSD = _poolOUSD3CRV.get_dy(1, 0, amount3CRV);

        // Set minimum required accounting for slippage
        _minimumOUSD = (_expectedOUSD * (100 - _slippage)) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        require(_minimumOUSD >= _guardOUSD, "LvUSD pool too imbalanced.");

        // Increase allowance
        _crv3.safeIncreaseAllowance(address(_poolOUSD3CRV), amount3CRV);

        // Exchange LvUSD for 3CRV:
        _returnedOUSD = _poolOUSD3CRV.exchange(1, 0, amount3CRV, _minimumOUSD);

        // Set approval to zero for safety
        _crv3.safeApprove(address(_poolOUSD3CRV), 0);

        return _returnedOUSD;
    }
}
