// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IExchanger} from "./interfaces/IExchanger.sol";
import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {AccessController} from "./AccessController.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

/// TODO Approval & Allownace should NOT BE MAX VALUES for pools
/// Use the overloaded function with TO parameter for exchange

/// @title Exchanger
/// @dev is in charge of interacting with the CurveFi pools
contract Exchanger is AccessController, ReentrancyGuardUpgradeable, IExchanger, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address internal _addressParameterStore;
    address internal _addressCoordinator;
    address internal _addressPoolLvUSD3CRV;
    address internal _addressPoolOUSD3CRV;
    IERC20Upgradeable internal _lvUSD;
    IERC20Upgradeable internal _ousd;
    IERC20Upgradeable internal _crv3;
    ICurveFiCurve internal _poolLvUSD3CRV;
    ICurveFiCurve internal _poolOUSD3CRV;

    ParameterStore internal _paramStore;
    int128 internal _indexLvUSD;
    int128 internal _indexOUSD;
    int128 internal _index3CRV;

     /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */

    uint256[44] private __gap;

    // /** @dev curve stable metapools provide 1:1 swaps
    //  * if the pools are very bent, this is a protection for users
    //  * TODO: user should be able to override and force a trade
    //  * @dev expressed as a percentage
    //  * 100 would require a perfect 1:1 swap
    //  * 90 allows at most, 1:.9 swaps
    //  */
    // uint256 internal _curveGuardPercentage;

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
    function setDependencies(
        address addressParameterStore,
        address addressCoordinator,
        address addressLvUSD,
        address addressOUSD,
        address address3CRV,
        address addressPoolLvUSD3CRV,
        address addressPoolOUSD3CRV
    ) external nonReentrant onlyAdmin {
        require(addressParameterStore != address(0), "cant set to 0 A");
        require(addressCoordinator != address(0), "cant set to 0 A");
        require(addressLvUSD != address(0), "cant set to 0 A");
        require(addressOUSD != address(0), "cant set to 0 A");
        require(address3CRV != address(0), "cant set to 0 A");
        require(addressPoolLvUSD3CRV != address(0), "cant set to 0 A");
        require(addressPoolOUSD3CRV != address(0), "cant set to 0 A");

        // Set variables
        _addressParameterStore = addressParameterStore;
        _addressCoordinator = addressCoordinator;
        _addressPoolLvUSD3CRV = addressPoolLvUSD3CRV;
        _addressPoolOUSD3CRV = addressPoolOUSD3CRV;

        // Load contracts
        _paramStore = ParameterStore(addressParameterStore);
        _lvUSD = IERC20Upgradeable(addressLvUSD);
        _ousd = IERC20Upgradeable(addressOUSD);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolLvUSD3CRV = ICurveFiCurve(addressPoolLvUSD3CRV);
        _poolOUSD3CRV = ICurveFiCurve(addressPoolOUSD3CRV);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());

        _indexLvUSD = 0;
        _indexOUSD = 0;
        _index3CRV = 1;
    }

    function _exchangerLvUSDBurnOnUnwind(uint256 amount) internal {
        /// Is it possible to exploit via transferring lvUSD to exchanger which then go back to coordinator?
        uint256 currentExchangerLvUSDBalance = _lvUSD.balanceOf(address(this));
        require(currentExchangerLvUSDBalance >= amount, "insuf lvUSD to trnsf to Exhanger");
        ERC20Burnable(address(_lvUSD)).burn(amount);
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
    function swapOUSDforLvUSD(uint256 amountOUSD, uint256 minRequiredLvUSD)
        external
        nonReentrant
        onlyExecutive
        returns (uint256 lvUSDReturned, uint256 remainingOUSD)
    {
        return _swapOUSDforLvUSD(amountOUSD, minRequiredLvUSD);
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * @param amountLvUSD amount of LvUSD we will put in
     * @return amountOUSD amount of OUSD returned from exchange
     * - MUST emit an event
     * NOTE: There is no guarantee of a 1:1 exchange ratio, but should be close
     * Minimum is 90% * 90%  / _curveGuardPercentage * _curveGuardPercentage
     */
    function swapLvUSDforOUSD(uint256 amountLvUSD) external nonReentrant onlyExecutive returns (uint256 amountOUSD) {
        return _swapLvUSDforOUSD(amountLvUSD);
    }

    // Send OUSD, get lvUSD back and the reminder of OUSD
    function _swapOUSDforLvUSD(uint256 amountOUSD, uint256 minRequiredLvUSD) internal returns (uint256 lvUSDReturned, uint256 remainingOUSD) {
        /// process is go to OUSD/3CRV pool, exchange as much OUSD as needed for enough 3CRV. Exhange all the 3CRV you got for lvUSD on lvUSD/3CRV pool
        // Get the amount of 3CRV gotten from exhanging minRequiredLvUSD or lvUSD to 3CRV. This is actually the other way around then what we will actually do. Used as an indicator
        uint256 _needed3CRV = _poolLvUSD3CRV.get_dy(0, 1, minRequiredLvUSD);
        // Get the amount of OUSD gotten from exhanging above amount of 3CRV on OUSD/3CRV pool
        uint256 _neededOUSD = _poolOUSD3CRV.get_dy(1, 0, _needed3CRV);
        // Add small buffer to needed OUSD and calculate in the right order (ie first exhange OUSD for 3CRV, then exhange that 3CRV for lvUSD)
        /// Notice that the small slippage is static here. Further below when we actaully exhange funds we use the user defined slippage.
        _neededOUSD = (_neededOUSD * 1005) / 1000; // This will fix lower balances slippages
        uint256 _obtained3CRV = _poolOUSD3CRV.get_dy(0, 1, _neededOUSD);
        uint256 _obtainedLvUSD = _poolLvUSD3CRV.get_dy(1, 0, _obtained3CRV);
        /// if the amount of expected lvUSD (_obtainedLvUSD) is lower then the min amount of lvUSD we expect to get back, re-calculate
        // the important output of this code block is the correct amount of _neededOUSD to exhange through the flow of the two pools.
        if (_obtainedLvUSD < minRequiredLvUSD) {
            // _difference will give us the delta of lvUSD we need to get (which means using more OUSD)
            uint256 _difference = (minRequiredLvUSD) - _obtainedLvUSD + 10**18; // +1 just in case
            uint256 _crv3Difference = _poolOUSD3CRV.get_dy(0, 1, _difference);
            uint256 _lvUSDDifference = _poolLvUSD3CRV.get_dy(1, 0, _crv3Difference);

            uint256 finalAmount = _obtainedLvUSD + _lvUSDDifference;
            _neededOUSD = _neededOUSD + _difference;

            /// Do same correction cycle as above again.
            if (finalAmount < (minRequiredLvUSD)) {
                // console.log("Inside calc finalAmount");
                _difference = (minRequiredLvUSD) - finalAmount + 10**18; // +1 just in case
                _crv3Difference = _poolOUSD3CRV.get_dy(0, 1, _difference);
                _lvUSDDifference = _poolLvUSD3CRV.get_dy(1, 0, _crv3Difference);

                finalAmount = finalAmount + _lvUSDDifference;
                _neededOUSD = _neededOUSD + _difference;
            }
            // console.log("_swapOUSDforLvUSD_inside if: _neededOUSD %s, finalAmount(ofLUSD) %s", _neededOUSD / 1 ether, finalAmount / 1 ether);
        }
        // console.log("_swapOUSDforLvUSD1 : _neededOUSD %s, _obtainedLvUSD %s", _neededOUSD / 1 ether, _obtainedLvUSD / 1 ether);
        require(amountOUSD >= _neededOUSD, "Not enough OUSD for exchange");

        // We lose some $ from fees and slippage
        // multiply _neededOUSD * 103%
        uint256 _returned3CRV = _xOUSDfor3CRV(_neededOUSD);

        uint256 _returnedLvUSD = _x3CRVforLvUSD(_returned3CRV);
        require(_returnedLvUSD >= minRequiredLvUSD, "3/lv insuf eX to lvUSD");

        // calculate remaining OUSD
        remainingOUSD = amountOUSD - _neededOUSD;
        _ousd.safeTransfer(_addressCoordinator, remainingOUSD);

        // send all swapped lvUSD to coordinator
        _exchangerLvUSDBurnOnUnwind(_returnedLvUSD);

        return (_returnedLvUSD, remainingOUSD);
    }

    function _swapLvUSDforOUSD(uint256 amountLvUSD) internal returns (uint256 amountOUSD) {
        uint256 _returned3CRV = _xLvUSDfor3CRV(amountLvUSD);
        uint256 _returnedOUSD = _x3CRVforOUSD(_returned3CRV);
        _ousd.safeTransfer(_addressCoordinator, _returnedOUSD);
        return _returnedOUSD;
    }

    /**
     * @dev Exchange using the CurveFi LvUSD/3CRV Metapool
     * @param amountLvUSD amount of LvUSD to exchange
     * @return amount3CRV amount of 3CRV returned from exchange
     */
    function _xLvUSDfor3CRV(uint256 amountLvUSD) internal returns (uint256 amount3CRV) {
        /**
         * _expected3CRV uses get_dy() to estimate amount the exchange will give us
         * _minimum3CRV minimum accounting for slippage. (_expected3CRV * slippage)
         * _returned3CRV amount we actually get from the pool
         * _guard3CRV sanity check to protect user
         */
        uint256 _expected3CRV;
        uint256 _minimum3CRV;
        uint256 _returned3CRV;
        uint256 _guard3CRV = (amountLvUSD * _paramStore.getCurveGuardPercentage()) / 100;

        // Verify Exchanger has enough LvUSD to use
        require(amountLvUSD <= _lvUSD.balanceOf(address(this)), "Insufficient LvUSD in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expected3CRV = _poolLvUSD3CRV.get_dy(0, 1, amountLvUSD);

        // /// Make sure expected3CRV is not too high!
        _checkExchangeExpectedReturnInLimit(amountLvUSD, _expected3CRV);

        // Set minimum required accounting for slippage
        _minimum3CRV = (_expected3CRV * (100 - _paramStore.getSlippage())) / 100;

        // Make sure pool isn't too bent
        // TODO allow user to override this protection
        // TODO auto balance if pool is bent
        // console.log("Exchanger:req  _minimum3CRV >= _guard3CRV, %s >= %s", _minimum3CRV, _guard3CRV);
        require(_minimum3CRV >= _guard3CRV, "LvUSD pool too imbalanced.");

        // Increase allowance
        _lvUSD.safeIncreaseAllowance(address(_poolLvUSD3CRV), amountLvUSD);

        // Exchange LvUSD for 3CRV:
        _returned3CRV = _poolLvUSD3CRV.exchange(0, 1, amountLvUSD, _minimum3CRV);

        // Set approval to zero for safety
        _lvUSD.safeApprove(address(_poolLvUSD3CRV), 0);

        return _returned3CRV;
    }

    /**
     * @dev Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amountOUSD amount of OUSD to put into the pool
     * @return amount3CRV amount of 3CRV returned from exchange
     */
    function _xOUSDfor3CRV(uint256 amountOUSD) internal returns (uint256 amount3CRV) {
        /**
         * @param _expected3CRV uses get_dy() to estimate amount the exchange will give us
         * @param _minimum3CRV minimum accounting for slippage. (_expected3CRV * slippage)
         * @param _returned3CRV amount we actually get from the pool
         * @param _guard3CRV sanity check to protect user
         */
        uint256 _expected3CRV;
        uint256 _minimum3CRV;
        uint256 _returned3CRV;
        uint256 _guard3CRV = (amountOUSD * _paramStore.getCurveGuardPercentage()) / 100;

        // Verify Exchanger has enough OUSD to use
        // console.log("amountOUSD <= _ousd.balanceOf(address(this) %s <= %s", amountOUSD, _ousd.balanceOf(address(this)));
        require(amountOUSD <= _ousd.balanceOf(address(this)), "Insufficient OUSD in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expected3CRV = _poolOUSD3CRV.get_dy(0, 1, amountOUSD);

        // Set minimum required accounting for slippage
        _minimum3CRV = (_expected3CRV * (100 - _paramStore.getSlippage())) / 100;

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
         * @param _minimumLvUSD minimum accounting for slippage. (_expectedLvUSD * slippage)
         * @param _returnedLvUSD amount we actually get from the pool
         * @param _guardLvUSD sanity check to protect user
         */
        uint256 _expectedLvUSD;
        uint256 _minimumLvUSD;
        uint256 _returnedLvUSD;
        uint256 _guardLvUSD = (amount3CRV * _paramStore.getCurveGuardPercentage()) / 100;

        // Verify Exchanger has enough 3CRV to use
        require(amount3CRV <= _crv3.balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expectedLvUSD = _poolLvUSD3CRV.get_dy(1, 0, amount3CRV);

        // Set minimum required accounting for slippage
        _minimumLvUSD = (_expectedLvUSD * (100 - _paramStore.getSlippage())) / 100;

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
     * @dev Exchange using the CurveFi OUSD/3CRV Metapool
     * @param amount3CRV amount of LvUSD to exchange
     * @return amountOUSD amount returned from exchange
     */
    function _x3CRVforOUSD(uint256 amount3CRV) internal returns (uint256 amountOUSD) {
        /**
         * @param _expectedOUSD uses get_dy() to estimate amount the exchange will give us
         * @param _minimumOUSD minimum accounting for slippage. (_expectedOUSD * slippage)
         * @param _returnedOUSD amount we actually get from the pool
         * @param _guardOUSD sanity check to protect user
         */
        uint256 _expectedOUSD;
        uint256 _minimumOUSD;
        uint256 _returnedOUSD;
        uint256 _guardOUSD = (amount3CRV * _paramStore.getCurveGuardPercentage()) / 100;

        // Verify Exchanger has enough 3CRV to use
        require(amount3CRV <= _crv3.balanceOf(address(this)), "Insufficient 3CRV in Exchanger.");

        // Estimate expected amount of 3CRV
        // get_dy(indexCoinSend, indexCoinRec, amount)
        _expectedOUSD = _poolOUSD3CRV.get_dy(1, 0, amount3CRV);

        // Set minimum required accounting for slippage
        _minimumOUSD = (_expectedOUSD * (100 - _paramStore.getSlippage())) / 100;

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

    function _checkExchangeExpectedReturnInLimit(uint256 amountToExchange, uint256 expctedExchangeReturn) internal {
        uint256 maxAllowedExchangeReturn = amountToExchange + (amountToExchange * _paramStore.getCurveMaxExchangeGuard()) / 100;
        require(expctedExchangeReturn <= maxAllowedExchangeReturn, "Expected return value too big");
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    function estimateOusdReturnedOnUnwindMinusInterest(uint256 amountOUSD, uint256 minRequiredLvUSD) external view returns (uint256) {
        uint256 _needed3CRV = _poolLvUSD3CRV.get_dy(0, 1, minRequiredLvUSD);
        uint256 _neededOUSD = _poolOUSD3CRV.get_dy(1, 0, _needed3CRV);
        // console.log("estimateOusdReturnedOnUnwind 1: _needed3CRV %s, _neededOUSD %s", _needed3CRV / 1 ether, _neededOUSD / 1 ether);

        _neededOUSD = (_neededOUSD * 1005) / 1000; // This will fix lower balances slippages
        uint256 _obtained3CRV = _poolOUSD3CRV.get_dy(0, 1, _neededOUSD);
        uint256 _obtainedLvUSD = _poolLvUSD3CRV.get_dy(1, 0, _obtained3CRV);

        if (_obtainedLvUSD < (minRequiredLvUSD)) {
            uint256 _difference = (minRequiredLvUSD) - _obtainedLvUSD + 10**18; // +1 just in case
            uint256 _crv3Difference = _poolOUSD3CRV.get_dy(0, 1, _difference);
            uint256 _lvUSDDifference = _poolLvUSD3CRV.get_dy(1, 0, _crv3Difference);

            uint256 finalAmount = _obtainedLvUSD + _lvUSDDifference;
            _neededOUSD = _neededOUSD + _difference;

            if (finalAmount < (minRequiredLvUSD)) {
                _difference = (minRequiredLvUSD) - finalAmount + 10**18; // +1 just in case
                _crv3Difference = _poolOUSD3CRV.get_dy(0, 1, _difference);
                _lvUSDDifference = _poolLvUSD3CRV.get_dy(1, 0, _crv3Difference);

                finalAmount = finalAmount + _lvUSDDifference;
                _neededOUSD = _neededOUSD + _difference;
            }
        }
        return amountOUSD - _neededOUSD;
    }

    fallback() external {
        revert("Exchanger : Invalid access");
    }
}
