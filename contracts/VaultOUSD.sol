// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessController} from "./AccessController.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

/// @title Archimedes OUSD vault
/// @notice Vault holds OUSD managed by Archimedes under all positions.
/// @notice It Uses ER4626 to mint shares for deposited OUSD.
contract VaultOUSD is ERC4626Upgradeable, AccessController, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    ParameterStore internal _paramStore;
    IERC20 internal _ousd;

    uint256 internal _assetsHandledByArchimedes = 0;

    function setDependencies(address _addressParamStore, address _addressOUSD) external {
        _paramStore = ParameterStore(_addressParamStore);
        _ousd = IERC20(_addressOUSD);
    }

    function archimedesDeposit(uint256 assets, address receiver) external nonReentrant returns (uint256) {
        _takeRebaseFees();
        _assetsHandledByArchimedes += assets;
        return deposit(assets, receiver);
    }

    function archimedesRedeem(
        uint256 shares,
        address receiver,
        address owner
    ) external nonReentrant returns (uint256) {
        _takeRebaseFees();
        uint256 redeemedAmountInAssets = redeem(shares, receiver, owner);
        _assetsHandledByArchimedes -= redeemedAmountInAssets;
        return redeemedAmountInAssets;
    }

    function takeRebaseFees() external nonReentrant {
        _takeRebaseFees();
    }

    function initialize(
        IERC20MetadataUpgradeable asset,
        string memory name,
        string memory symbol
    ) public initializer {
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());

        __ERC4626_init(asset);
        __ERC20_init(name, symbol);
    }

    function _takeRebaseFees() internal {
        uint256 unhandledRebasePayment = totalAssets() - _assetsHandledByArchimedes;
        /// only run fee collection if there are some rebased funds not handled
        if (unhandledRebasePayment > 0) {
            uint256 feeToCollect = (unhandledRebasePayment * _paramStore.getRebaseFeeRate()) / 1 ether;
            uint256 handledRebaseValueToKeepInVault = unhandledRebasePayment - feeToCollect;

            _assetsHandledByArchimedes += handledRebaseValueToKeepInVault;

            _ousd.transfer(_paramStore.getTreasuryAddress(), feeToCollect);
        }
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }
}
