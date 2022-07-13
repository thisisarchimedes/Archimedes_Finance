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
    IERC20Upgradeable internal _lvusd;
    IERC20Upgradeable internal _usdc;
    IERC20Upgradeable internal _crv3;
    ParameterStore internal _paramStore;
    ICurveFiCurve internal _poolLvUSD3CRV;
    IZapFi internal _zap;


    /**
     * @dev initialize Exchanger
     * @param addressParameterStore ParameterStore address
     * @param addressCoordinator Coordinator contract address
     * @param addressLvUSD lvUSD ERC20 contract address
     * @param addressUSDC USDC ERC20 contract address
     * @param address3CRV 3CRV ERC20 contract address
     * @param addressPoolLvUSD3CRV 3CRV+LvUSD pool address
     */
    function setDependencies(
        address addressParameterStore,
        address addressCoordinator,
        address addressLvUSD,
        address addressUSDC,
        address address3CRV,
        address addressZap,
    ) external nonReentrant onlyAdmin {
        // Set variables
        _addressParameterStore = addressParameterStore;
        _addressCoordinator = addressCoordinator;
        _addressPoolLvUSD3CRV = addressPoolLvUSD3CRV;


        // Load contracts
        _paramStore = ParameterStore(addressParameterStore);
        _lvusd = IERC20Upgradeable(addressLvUSD);
        _usdc = IERC20Upgradeable(addressUSDC);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolLvUSD3CRV = ICurveFiCurve(addressPoolLvUSD3CRV);
        _zap = IZapFi(addressZap);

    }

    function fundPoolWith3CRV(address buyerAddress, uint256 amoutToFund) external nonReentrant onlyAdmin {
        /// Method assumes that caller (which is admin), has allownce to spend buyerAddress 3CRV tokens
        /// Methos assumes that caller (which is admin), has allownce to spend Coordinator lvUSD tokens
        require(_lvusd.balanceOf(_addressCoordinator) > amoutLvUSDToBuy, "Insufficent lvUSD balance on Coordinator");
        // Transfer lvUSD and USDC to this contract
        _lvusd.safeTransferFrom(_addressCoordinator, address(this),amoutToFund );
        _usdc.safeTransferFrom(buyerAddress, address(this), amoutToFund)

        uint256[2] memory amounts = [amoutToFund,amoutToFund]

        _zap.add_liquidity(amounts)
        // erc20Token.safeTransferFrom( address from, address to, uint256 value)
        _crv3.safeTransferFrom(buyerAddress, _parameterStore.getTreasuryAddress(),amoutLvUSDToBuy)
        /// lvUSD will be transfered to buyerAddress
        _lvusd.safeTransferFrom(_addressCoordinator,amoutLvUSDToBuy)
    }

}