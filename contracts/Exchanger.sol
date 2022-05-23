// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IExchanger} from "./interfaces/IExchanger.sol";
import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "hardhat/console.sol";

/// TODO cleanup unecessary variables like amountOUSD = amountOUSD
/// TODO Make sure funds end up at coordinator address for WINDUP and UNWIND
/// TODO Approval & Allownace should NOT BE MAX VALUES for pools
/// Use the overloaded function with TO parameter for exchange

/// @title Exchanger
/// @dev is in charge of interacting with the CurveFi pools
contract Exchanger is IExchanger {
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
    IERC20 internal _3crv;
    ICurveFiCurve internal _poolLvUSD3CRV;
    ICurveFiCurve internal _poolOUSD3CRV;

    ParameterStore internal _paramStore;
    int128 internal _indexLvUSD = 0;
    int128 internal _indexOUSD = 0;
    int128 internal _index3CRV = 1;

    // TODO should slippage be in ParamStore?
    uint256 internal _slippage;
    bool internal _initialized = false;

    /** @dev curve stable metapools provide 1:1 swaps
     * if the pools are very bent, this is a protection for users
     * TODO: user should be able to override and force a trade
     * @dev expressed as a percentage
     * 100 would require a perfect 1:1 swap
     * 90 allows at most, 1:.9 swaps
     * TODO make getter and setter for this or put in ParamStore
     */
    uint256 internal _curveGuardPercentage;

    constructor() {}

    /**
     * @dev initialize Exchanger
     * @param addressParameterStore ParameterStore address
     * @param addressCoordinator Coordinator contract address
     * @param addressLvUSD lvUSD ERC20 contract address
     * @param addressOUSD OUSD ERC20 contract address
     * @param address3CRV 3CRV ERC20 contract address
     * @param addressPoolLvUSD3CRV 3CRV+LvUSD pool address
     * @param addressPoolOUSD3CRV 3CRV+OUSD pool address
     */
    function init(
        address addressParameterStore,
        address addressCoordinator,
        address addressLvUSD,
        address addressOUSD,
        address address3CRV,
        address addressPoolLvUSD3CRV,
        address addressPoolOUSD3CRV
    ) external {
        // Set variables
        _addressParameterStore = addressParameterStore;
        _addressCoordinator = addressCoordinator;
        _addressLvUSD = addressLvUSD;
        _addressOUSD = addressOUSD;
        _address3CRV = address3CRV;
        _addressPoolLvUSD3CRV = addressPoolLvUSD3CRV;
        _addressPoolOUSD3CRV = addressPoolOUSD3CRV;

        // Load contracts
        _paramStore = ParameterStore(addressParameterStore);
        _lvusd = IERC20(_addressLvUSD);
        _ousd = IERC20(_addressOUSD);
        _3crv = IERC20(_address3CRV);
        _poolLvUSD3CRV = ICurveFiCurve(addressPoolLvUSD3CRV);
        _poolOUSD3CRV = ICurveFiCurve(addressPoolOUSD3CRV);

        // Approve Coordinator
        _lvusd.safeApprove(_addressCoordinator, type(uint256).max);
        _ousd.safeApprove(_addressCoordinator, type(uint256).max);
        // Approve LvUSD pool
        _lvusd.safeApprove(_addressPoolLvUSD3CRV, type(uint256).max);
        _3crv.safeApprove(_addressPoolLvUSD3CRV, type(uint256).max);
        // approve OUSD pool
        _ousd.safeApprove(_addressPoolOUSD3CRV, type(uint256).max);
        _3crv.safeApprove(_addressPoolOUSD3CRV, type(uint256).max);

        // TODO add to param store with get/setter
        _curveGuardPercentage = 90; // 90%
        // TODO add to param store with get/setter
        _slippage = 2; // 2%

        // TODO remove this after the accessControl is added
        _initialized = true;
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * @param amountLvUSD amount of LvUSD we will put in
     * @return amountOUSD amount of OUSD returned from exchange
     * - MUST emit an event
     * NOTE: There is no guarantee of a 1:1 exchange ratio, but should be close
     * Minimum is 90% * 90%  / _curveGuardPercentage * _curveGuardPercentage
     */
    function xLvUSDforOUSD(uint256 amountLvUSD, address to) external returns (uint256 amountOUSD) {
        uint256 _returned3CRV = _xLvUSDfor3CRV(amountLvUSD, address(this));
        uint256 _returnedOUSD = _x3CRVforOUSD(_returned3CRV, _addressCoordinator);
        // TODO emit an event
        return _returnedOUSD;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * returns amount of LvUSD
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * @param amountOUSD amount of OUSD we have available to exchange
     * @param to address to send the exchanged LvUSD
     * @param minRequiredLvUSD amount of OUSD we must get back or revert
     * @return lvUSDReturned amount of LvUSD we got back
     * NOTE: lvUSDReturned isnt necessarily minRequiredLvUSD - it
     * will be at least that much based on pool price variations
     * @return remainingOUSD amount of left over OUSD after the exchange
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     * @dev OUSD funds are already under Exchanger address, if called by Coordinator
     */
    function xOUSDforLvUSD(
        uint256 amountOUSD,
        address to,
        uint256 minRequiredLvUSD
    ) external returns (uint256 lvUSDReturned, uint256 remainingOUSD) {
        // Use "minRequiredLvUSD" to estimate "neededOUSD"
        uint256 _needed3CRV = _poolLvUSD3CRV.get_dy(_indexLvUSD, _index3CRV, minRequiredLvUSD);
        uint256 _neededOUSD = _poolOUSD3CRV.get_dy(_index3CRV, _indexOUSD, _needed3CRV);

        // We lose some $ from fees and slippage:
        // multiply _neededOUSD * 103%
        uint256 _returned3CRV = _xOUSDfor3CRV((_neededOUSD * 103) / 100, to);
        uint256 _returnedLvUSD = _x3CRVforLvUSD(_returned3CRV, to);

        require(_returnedLvUSD >= minRequiredLvUSD, "Pool imbalanced: not enough LvUSD");
        // TODO emit an event
        return (_returnedLvUSD, remainingOUSD);
    }

    /**
     * @dev Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amountOUSD amount of OUSD to put into the pool
     * @param to address to send exchanged 3CRV to
     * @return amount3CRV amount of 3CRV returned from exchange
     */
    function _xOUSDfor3CRV(uint256 amountOUSD, address to) internal returns (uint256 amount3CRV) {
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

        // Exchange LvUSD for 3CRV:
        _returned3CRV = _poolOUSD3CRV.exchange(0, 1, amountOUSD, _minimum3CRV);

        return _returned3CRV;
    }

    /**
     * @dev Exchange using the CurveFi LvUSD/3CRV Metapool
     * @param amount3CRV amount of 3CRV to exchange
     * @param to address to send exchanged 3CRV to
     * @return amountLvUSD amount of LvUSD returned from exchange
     */
    function _x3CRVforLvUSD(uint256 amount3CRV, address to) internal returns (uint256 amountLvUSD) {
        /**
         * @param _expectedLvUSD uses get_dy() to estimate amount the exchange will give us
         * @param _minimumLvUSD mimimum accounting for slippage. (_expectedOUSD * slippage)
         * @param _returnedLvUSD amount we actually get from the pool
         * @param _guardLvUSD sanity check to protect user
         */
        uint256 _expectedLvUSD;
        uint256 _minimumLvUSD;
        uint256 _returnedLvUSD;
        uint256 _guardLvUSD = (amount3CRV * _curveGuardPercentage) / 100;

        // Verify Exchanger has enough 3CRV to use
        require(amount3CRV <= _3crv.balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expectedLvUSD = _poolLvUSD3CRV.get_dy(1, 0, amount3CRV);

        // Set minimum required accounting for slippage
        _minimumLvUSD = (_expectedLvUSD * (100 - _slippage)) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        require(_minimumLvUSD >= _guardLvUSD, "LvUSD pool too imbalanced.");

        // Exchange LvUSD for 3CRV:
        _returnedLvUSD = _poolLvUSD3CRV.exchange(1, 0, amount3CRV, _minimumLvUSD);

        return _returnedLvUSD;
    }

    /**
     * @dev Exchange using the CurveFi LvUSD/3CRV Metapool
     * @param amountLvUSD amount of LvUSD to exchange
     * @param to address to send exchanged 3CRV to
     * @return amount3CRV amount of 3CRV returned from exchange
     */
    function _xLvUSDfor3CRV(uint256 amountLvUSD, address to) internal returns (uint256 amount3CRV) {
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

        // Exchange LvUSD for 3CRV:
        _returned3CRV = _poolLvUSD3CRV.exchange(0, 1, amountLvUSD, _minimum3CRV);

        return _returned3CRV;
    }

    /**
     * @dev Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amount3CRV amount of LvUSD to exchange
     * @param to address to send exchanged 3CRV to
     * @return amountOUSD amount returned from exchange
     */
    function _x3CRVforOUSD(uint256 amount3CRV, address to) internal returns (uint256 amountOUSD) {
        /**
         * @param amount3CRV amount of 3CRV we are exchanging
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
        require(amount3CRV <= _3crv.balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expectedOUSD = _poolOUSD3CRV.get_dy(1, 0, amount3CRV);

        // Set minimum required accounting for slippage
        _minimumOUSD = (_expectedOUSD * (100 - _slippage)) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        require(_minimumOUSD >= _guardOUSD, "LvUSD pool too imbalanced.");

        // Exchange LvUSD for 3CRV:
        _returnedOUSD = _poolOUSD3CRV.exchange(1, 0, amount3CRV, _minimumOUSD);

        return _returnedOUSD;
    }

    function xLvUSDfor3CRV(uint256 amountLvUSD, address to) external returns (uint256) {
        return _xLvUSDfor3CRV(amountLvUSD, to);
    }

    function x3CRVforOUSD(uint256 amount3CRV, address to) external returns (uint256) {
        return _x3CRVforOUSD(amount3CRV, to);
    }

    function xOUSDfor3CRV(uint256 amountOUSD, address to) external returns (uint256) {
        return _xOUSDfor3CRV(amountOUSD, to);
    }

    function x3CRVforLvUSD(uint256 amount3CRV, address to) external returns (uint256) {
        return _x3CRVforLvUSD(amount3CRV, to);
    }
}
