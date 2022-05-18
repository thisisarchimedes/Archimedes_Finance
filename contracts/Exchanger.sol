// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IExchanger} from "./interfaces/IExchanger.sol";
import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "hardhat/console.sol";

/// @title Exchanger
/// @dev is in charge of interacting with the CurveFi pools
contract Exchanger is IExchanger {
    using SafeERC20 for IERC20;

    address internal _addressCoordinator;
    address internal _addressLvUSD;
    address internal _addressOUSD;
    address internal _address3CRV;
    IERC20 internal _lvusd;
    IERC20 internal _ousd;
    IERC20 internal _3crv;
    ICurveFiCurve internal _poolLvUSD3CRV;
    ICurveFiCurve internal _poolOUSD3CRV;
    ParameterStore internal _paramStore;

    // TODO should slippage be in ParamStore?
    uint256 internal _slippage;
    bool internal _initialized = false;

    /** @dev curve stable metapools provide 1:1 swaps
     * if the pools are bent this is a protection for users
     TODO: user should be able to override and force a trade
     * @dev expressed as a percentage
     * 100 would require a perfect 1:1 swap
     * 90 allows at most, 1:.9 swaps
     * TODO make getter and setter for this or put in ParamStore
     */
    uint256 internal _curveGuardPercentage;

    constructor() {}

    /** initialize Exchanger
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
        _paramStore = ParameterStore(addressParameterStore);
        _addressCoordinator = addressCoordinator;

        _addressLvUSD = addressLvUSD;
        _addressOUSD = addressOUSD;
        _address3CRV = address3CRV;

        _lvusd = IERC20(_addressLvUSD);
        _ousd = IERC20(_addressOUSD);
        _3crv = IERC20(_address3CRV);

        _poolLvUSD3CRV = ICurveFiCurve(addressPoolLvUSD3CRV);
        _poolOUSD3CRV = ICurveFiCurve(addressPoolOUSD3CRV);

        // approve Coordinator address to spend on behalf of exchanger
        _lvusd.safeApprove(_addressCoordinator, type(uint256).max);
        _ousd.safeApprove(_addressCoordinator, type(uint256).max);
        _curveGuardPercentage = 90; // 90%
        _slippage = 2; // 2%
        _initialized = true;
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * returns amount of OUSD
     * - MUST emit an event
     * NOTE: There is no guarantee of a 1:1 exchange ratio
     * Minimum is 90% * 90%  / _curveGuardPercentage * _curveGuardPercentage
     */
    function xLvUSDforOUSD(uint256 amountLvUSD, address to) external returns (uint256) {
        console.log("amountLvUSD to exchange in xLvUSDforOUSD", amountLvUSD);
        uint256 returned3CRV = _xLvUSDfor3CRV(amountLvUSD, _addressCoordinator);
        console.log("Returned 3CRV from xLvUSDforOUSD", returned3CRV);
        uint256 returnedOUSD = _x3CRVforOUSD(returned3CRV, _addressCoordinator);
        console.log("Returned OUSD from xLvUSDforOUSD", returnedOUSD);
        console.log("Exchanging %s lvUSD to OUSD, assigning funds to address %s", amountLvUSD, to);
        return returnedOUSD;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * returns amount of LvUSD
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     * @dev OUSD funds are already under Exchanger address, if called by Coordinator
     */
    function xOUSDforLvUSD(
        uint256 amountOUSD,
        address to,
        uint256 minRequiredLvUSD
    ) external returns (uint256 lvUSDReturned, uint256 remainingOUSD) {
        // Check we have the funds >= amountOUSD
        console.log("Exchanging%s OUSD for min %slvUSD, assigning funds to address %s", amountOUSD, minRequiredLvUSD, to);

        // 1) Check pool is in balance OUSD/3CRV
        // expected3CRV = get_dy(0, 1, amountOUSD) > 90% OR REVERT

        // 2) Go to OUSD/3CRV pool and exchange OUSD for 3CRV:
        // returned3CRV = pool.exchange(0, 1, amountOUSD, expected3CRV)

        // 3) Go to LvUSD/3CRV pool and exchange 3CRV for LvUSD:
        // check LvUSD/3CRV pool is in balance:
        // expectedLvUSD = get_dy(0, 1, returned3CRV) > minRequiredLvUSD OR REVERT "pool imbalanced" - emit event?

        // 4) Go to LvUSD/3CRV pool and exchange 3CRV for LvUSD:
        // returnedLvUSD = pool.exchange(0, 1, returned3CRV, minRequiredLvUSD)

        // make sure ends up at "to" address
        return (minRequiredLvUSD, amountOUSD - minRequiredLvUSD);
    }

    /** Exchange using the CurveFi LvUSD/3CRV Metapool
     * @param amountLvUSD amount of LvUSD to exchange
     * @param to address to send exchanged 3CRV to
     */
    function _xLvUSDfor3CRV(uint256 amountLvUSD, address to) internal returns (uint256) {
        /**
         * @param _amountLvUSD amount of LvUSD we are exchanging
         * @param _expected3CRV uses get_dy() to estimate amount the exchange will give us
         * @param _minimum3CRV mimimum accounting for slippage. (_expected3CRV * slippage)
         * @param _returned3CRV amount we actually get from the pool
         */
        uint256 _amountLvUSD = amountLvUSD;
        uint256 _expected3CRV;
        uint256 _minimum3CRV;
        uint256 _returned3CRV;

        // Verify Exchanger has enough LvUSD to use
        require(_amountLvUSD <= IERC20(_lvusd).balanceOf(address(this)), "Insufficient LvUSD in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expected3CRV = _poolLvUSD3CRV.get_dy(0, 1, _amountLvUSD);

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        require(_expected3CRV >= (_amountLvUSD * _curveGuardPercentage) / 100, "LvUSD pool too imbalanced.");
        // TODO auto balance if pool is bent

        // Set minimum required accounting for slippage
        _minimum3CRV = (_expected3CRV * (100 - _slippage)) / 100;

        // Exchange LvUSD for 3CRV:
        _returned3CRV = _poolLvUSD3CRV.exchange(0, 1, _amountLvUSD, _minimum3CRV, to);

        return _returned3CRV;
    }

    function xLvUSDfor3CRV(uint256 amountLvUSD, address to) external returns (uint256) {
        return _xLvUSDfor3CRV(amountLvUSD, to);
    }

    /** Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amount3CRV amount of LvUSD to exchange
     * @param to address to send exchanged 3CRV to
     */
    function _x3CRVforOUSD(uint256 amount3CRV, address to) internal returns (uint256) {
        /**
         * @param _amount3CRV amount of 3CRV we are exchanging
         * @param _expectedOUSD uses get_dy() to estimate amount the exchange will give us
         * @param _minimumOUSD mimimum accounting for slippage. (_expectedOUSD * slippage)
         */
        uint256 _amount3CRV = amount3CRV;
        uint256 _expectedOUSD;
        uint256 _minimumOUSD;

        // Verify Exchanger has enough LvUSD to use
        require(_amount3CRV <= IERC20(_3crv).balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        _expectedOUSD = _poolOUSD3CRV.get_dy(0, 1, _amount3CRV);

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        require(_expectedOUSD >= (_amount3CRV * _curveGuardPercentage) / 100, "3CRV pool too imbalanced.");
        // TODO auto balance if pool is bent

        // Set minimum required accounting for slippage
        _minimumOUSD = (_expectedOUSD * (100 - _slippage)) / 100;

        // Exchange LvUSD for 3CRV:
        return _poolOUSD3CRV.exchange(0, 1, _amount3CRV, _minimumOUSD, to);
    }

    function x3CRVforOUSD(uint256 amount3CRV, address to) external returns (uint256) {
        return _x3CRVforOUSD(amount3CRV, to);
    }
}
