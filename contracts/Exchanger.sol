// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICurveFiCurve} from "./interfaces/iCurveFi.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "hardhat/console.sol";

contract Exchanger {

    address internal _addressParameterStore;
    ParameterStore internal _parameterStore;
    ICurveFiCurve internal _poolLvUSD3CRV;
    ICurveFiCurve internal _poolOUSD3CRV;
    address internal _tokenLvUSD;
    address internal _tokenOUSD;
    address internal _tokenCoordinator;
    address internal _poolLvUSD3CRV;
    address internal _poolOUSD3CRV;
    uint256 internal _minimumExchangeAmount;
    uint256 internal _slippage;
    bool internal _initialized = false;

    /** @dev curve stable metapools provide 1:1 swaps
     * if the pools are bent this is a protection for users
     TODO: user should be able to override and force a trade
     * @dev expressed as a percentage
     * 100 would require a perfect 1:1 swap
     */
    uint256 public curveMinimumSwapPercentage;

    constructor () {
        curveMinimumSwapPercentage = 90; // 90%
        _slippage = 2; // 2%
    }

    /** initialize Exchanger
     * @param tokenLvUSD lvUSD ERC20 contract address
     * @param tokenOUSD OUSD ERC20 contract address
     * @param tokenCoordinator Coordinator contract address
     * @param poolLvUSD3CRV 3CRV+LvUSD pool address
     * @param poolOUSD3CRV 3CRV+OUSD pool address
     */
    function init(
        address addressParameterStore,
        address tokenLvUSD,
        address tokenOUSD,
        address tokenCoordinator,
        address poolLvUSD3CRV,
        address poolOUSD3CRV
    ) external {
        _addressParameterStore = addressParameterStore;
        _parameterStore = ParameterStore(_addressParameterStore);
        _tokenLvUSD = tokenLvUSD;
        _tokenOUSD = tokenOUSD;
        _tokenCoordinator = tokenCoordinator;
        _poolLvUSD3CRV = ICurveFiCurve(poolLvUSD3CRV);
        _poolOUSD3CRV = ICurveFiCurve(poolOUSD3CRV);
        IERC20(tokenLvUSD).approve(_tokenCoordinator, type(uint256).max);
        IERC20(tokenOUSD).approve(_tokenCoordinator, type(uint256).max);
        _initialized = true;
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * returns amount of OUSD
     * - MUST emit an event
     * NOTE: There is no guarantee of a 1:1 exchange ratio
     * Minimum is 90% * 90%
     */
    function xLvUSDforOUSD(uint256 amountLvUSD, address to) external view returns (uint256) {
        /// TODO: Change this to an event later
        console.log("Exchanging %s lvUSD to OUSD, assigning funds to address %s", amountLvUSD, to);

        uint256 memory _amountLvUSDtoExchange = amountLvUSD;

        uint256 memory _expected3CRV;
        uint256 memory _minimum3CRV;
        uint256 memory _returned3CRV;

        uint256 memory _expectedOUSD;
        uint256 memory _minimum3OUSD;
        uint256 memory _returnedOUSD;

        // Set sanity check / guard rail values:
        // This protect users. Make sure the swapped amount is within our accepted range
        // By default curveMinimumSwapPercentage is 90%, which allows 10% skew between stables
        uint256 memory _required3CRV = (_amountLvUSDtoExchange * curveMinimumSwapPercentage) / 100;
        uint256 memory _requiredOUSD = (_minimum3CRV * curveMinimumSwapPercentage) / 100;

        // Verify Exchanger has enough LvUSD to use
        require(_amountLvUSDtoExchange <= IERC20(_tokenLvUSD).balanceOf(address(this)), "Insufficient LvUSD in Exchanger.");

        // Preview the exchange to get expected amount of 3CRV
        _expected3CRV = _poolLvUSD3CRV.get_dy(0, 1, _amountLvUSDtoExchange);

        // TODO allow user to force this even if pool is imbalanced!
        require(_expected3CRV >= _minimum3CRV, "LvUSD Curve pool too imbalanced.");

        // Set minimum accounting for slippage 
        // (100 - 2) / 100 = 98%
        _minimum3CRV = (_expected3CRV * (100 - _slippage)) / 100;

        // Exchange LvUSD for 3CRV:
        _returned3CRV = _poolLvUSD3CRV.exchange(0, 1, _amountLvUSDtoExchange, _minimum3CRV);

        /// TODO repeat for OUSD
        // 3) Go to OUSD/3CRV pool and exchange 3CRV for OUSD:
        // check OUSD/3CRV pool is in balance:
        uint256 memory expectedOUSD = _poolOUSD3CRV.get_dy(0, 1, returned3CRV);
        // TODO allow user to force this even if pool is imbalanced!
        // Guard rail in case the curve pool is skewed
        uint256 memory minRequiredOUSD = (returned3CRV * curveMinimumSwapPercentage) / 100;
        require(expectedOUSD >= minRequiredOUSD, "OUSD Curve pool too imbalanced.");

        // 4) Go to OUSD/3CRV pool and exchange 3CRV for OUSD:
        uint256 memory returnedOUSD = _poolOUSD3CRV.exchange(0, 1, returned3CRV, expectedOUSD)

        //5) Move returnedOUSD to correct place - "to" address:
        // user _receiver (overloaded) or just transfer

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
    ) external view returns (uint256 lvUSDReturned, uint256 remainingOUSD) {
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

    function getCurveMinimumRatio() public view returns (uint256) {
        return _curveMinimumRatio;
    }

    function changeCurveMinimumRatio(uint256 newCurveMinimumRatio) external {
        require(newCurveMinimumRatio <= 100, "Ratio must be less than or equal to 100");
        _curveMinimumRatio = newCurveMinimumRatio;
    }

}
