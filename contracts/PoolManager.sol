// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {AccessController} from "./AccessController.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract PoolManager is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address internal _addressParameterStore;
    address internal _addressCoordinator;
    address internal _addressPoolLvUSD3CRV;
    IERC20Upgradeable internal _lvusd;
    IERC20Upgradeable internal _crv3;
    ParameterStore internal _paramStore;
    ICurveFiCurve internal _poolLvUSD3CRV;
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */

    uint256[44] private __gap;

    function initialize() public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    /**
     * @dev initialize Pool Manager
     * @param addressParameterStore ParameterStore address
     * @param addressCoordinator Coordinator contract address
     * @param addressLvUSD lvUSD ERC20 contract address
     * @param address3CRV 3CRV ERC20 contract address
     * @param addressPoolLvUSD3CRV 3CRV+LvUSD pool address
     */
    function setDependencies(
        address addressParameterStore,
        address addressCoordinator,
        address addressLvUSD,
        address address3CRV,
        address addressPoolLvUSD3CRV
    ) external nonReentrant onlyAdmin {
        // Set variables
        _addressParameterStore = addressParameterStore;
        _addressCoordinator = addressCoordinator;
        _addressPoolLvUSD3CRV = addressPoolLvUSD3CRV;

        // Load contracts
        _paramStore = ParameterStore(addressParameterStore);
        _lvusd = IERC20Upgradeable(addressLvUSD);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolLvUSD3CRV = ICurveFiCurve(addressPoolLvUSD3CRV);

        _lvusd.safeApprove(_addressPoolLvUSD3CRV, 0);
        _crv3.safeApprove(_addressPoolLvUSD3CRV, 0);

        _lvusd.safeApprove(_addressPoolLvUSD3CRV, type(uint256).max);
        _crv3.safeApprove(_addressPoolLvUSD3CRV, type(uint256).max);
    }

    function fundPoolWith3CRV(address buyerAddress, uint256 amoutToFundInLvUSD) external nonReentrant onlyAdmin returns (uint256) {
        /// Method assumes that this contract , has allowance to spend buyerAddress 3CRV tokens
        /// Method assumes that this contract, has allowance to spend Coordinator lvUSD tokens
        require(_lvusd.balanceOf(_addressCoordinator) > amoutToFundInLvUSD, "Insufficient lvUSD on Coord");
        // // Transfer lvUSD and 3CRV to this contract
        _lvusd.safeTransferFrom(_addressCoordinator, address(this), amoutToFundInLvUSD);
        _crv3.safeTransferFrom(buyerAddress, address(this), amoutToFundInLvUSD);
        uint256[2] memory amounts = [amoutToFundInLvUSD, amoutToFundInLvUSD];
        uint256 expectedTokenAmountToGet = (_poolLvUSD3CRV.calc_token_amount(amounts, true) * 99) / 100;
        return _poolLvUSD3CRV.add_liquidity(amounts, expectedTokenAmountToGet, buyerAddress);
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }
}
