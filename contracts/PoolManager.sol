// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {AccessController} from "./AccessController.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {IZapFi} from "./interfaces/IZapFi.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract PoolManager is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address internal _addressParameterStore;
    address internal _addressCoordinator;
    address internal _addressPoolLvUSD3CRV;
    // address internal _addressZap;
    IERC20Upgradeable internal _lvusd;
    // IERC20Upgradeable internal _usdc;
    IERC20Upgradeable internal _crv3;
    ParameterStore internal _paramStore;
    ICurveFiCurve internal _poolLvUSD3CRV;
    // IZapFi internal _zap;

    uint256 internal _maxInt;

    function initialize() public initializer {
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    // /**
    //  * @dev initialize Exchanger
    //  * @param addressParameterStore ParameterStore address
    //  * @param addressCoordinator Coordinator contract address
    //  * @param addressLvUSD lvUSD ERC20 contract address
    //  * @param addressUSDC USDC ERC20 contract address
    //  * @param address3CRV 3CRV ERC20 contract address
    //  * @param addressPoolLvUSD3CRV 3CRV+LvUSD pool address
    //  */
    function setDependencies(
        address addressParameterStore,
        address addressCoordinator,
        address addressLvUSD,
        address addressUSDC,
        address address3CRV,
        address addressPoolLvUSD3CRV,
        address addressZap
    ) external nonReentrant onlyAdmin {
        // Set variables
        _addressParameterStore = addressParameterStore;
        _addressCoordinator = addressCoordinator;
        _addressPoolLvUSD3CRV = addressPoolLvUSD3CRV;
        // _addressZap = addressZap;

        // Load contracts
        _paramStore = ParameterStore(addressParameterStore);
        _lvusd = IERC20Upgradeable(addressLvUSD);
        // _usdc = IERC20Upgradeable(addressUSDC);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolLvUSD3CRV = ICurveFiCurve(addressPoolLvUSD3CRV);
        // _zap = IZapFi(addressZap);

        _maxInt = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

        // _lvusd.approve(_addressZap, _maxInt);
        // _usdc.approve(_addressZap, _maxInt);
        // _crv3.approve(_addressZap, _maxInt);

        _lvusd.approve(_addressPoolLvUSD3CRV, _maxInt);
        // _usdc.approve(_addressPoolLvUSD3CRV, _maxInt);
        _crv3.approve(_addressPoolLvUSD3CRV, _maxInt);

        // _lvusd.approve(address(this), _maxInt);
        // _usdc.approve(address(this), _maxInt);
        // _crv3.approve(address(this), _maxInt);
    }

    function fundPoolWithUSDC(address buyerAddress, uint256 amoutToFundInLvUSD) external nonReentrant onlyAdmin {
        /// Method assumes that caller (which is admin), has allownce to spend buyerAddress 3CRV tokens
        /// Method assumes that caller (which is admin), has allownce to spend Coordinator lvUSD tokens
        require(_lvusd.balanceOf(_addressCoordinator) > amoutToFundInLvUSD, "Insufficent lvUSD on Coordinator");
        // // Transfer lvUSD and 3crv to this contract
        _lvusd.safeTransferFrom(_addressCoordinator, address(this), amoutToFundInLvUSD);
        _crv3.safeTransferFrom(buyerAddress, address(this), amoutToFundInLvUSD);

        console.log("Balance of PoolManager lvUSD %s", _lvusd.balanceOf(address(this)) / 1 ether);
        _printApprovals();
        console.log("Past trasnfer, now moving on to funding");

        // uint256[4] memory amounts = [amoutToFundInLvUSD, 0, amountToFundInUSDC, 0];
        console.log("Attempting to run pool.calc_token_amount");
        uint256[2] memory amounts = [amoutToFundInLvUSD, amoutToFundInLvUSD];
        console.log("will run pool.add_liquidity with amounts 0 - %s 1- %s", amounts[0] / 1 ether, amounts[1] / 1 ether);
        uint256 expectedTokenAmountToGet = (_poolLvUSD3CRV.calc_token_amount(amounts, true) * 99) / 100;

        console.log("expectedTokenAmountToGet = %s ", expectedTokenAmountToGet / 1 ether);
        console.log("expectedTokenAmountToGet static low = %s (this will be used moving forward", expectedTokenAmountToGet / 1 ether);
        console.log("Current Pool balance %s %s", _poolLvUSD3CRV.balances(0) / 1 ether, _poolLvUSD3CRV.balances(1) / 1 ether);
        console.log("From PoolManager: approving address %s", _addressPoolLvUSD3CRV);

        // _lvusd.approve(_addressPoolLvUSD3CRV, 10000 ether);
        console.log("Finished approving lvUSD");
        // _usdc.approve(_addressPoolLvUSD3CRV, _maxInt);
        // _crv3.approve(_addressPoolLvUSD3CRV, 10000 ether);
        console.log("Finished approving 3CRV");

        uint256 amountOfTokens = _poolLvUSD3CRV.add_liquidity(amounts, expectedTokenAmountToGet, buyerAddress);    
    }

    function _printApprovals() internal {
        console.log(
            "This address lvUSD and 3crv balance: %s, %s",
            _lvusd.balanceOf(address(this)) / 1 ether,
            _crv3.balanceOf(address(this)) / 1 ether
        );
        console.log(
            "Pool address allownce on lvUSD and 3crv and USDC owned by this address : %s, %s , %s",
            _lvusd.allowance(address(this), _addressPoolLvUSD3CRV) / 1 ether,
            _crv3.allowance(address(this), _addressPoolLvUSD3CRV) / 1 ether
        );
       
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }
}
