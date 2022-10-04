// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

// import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {AccessController} from "./AccessController.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "hardhat/console.sol";

/// @title Archimedes OUSD vault
/// @notice Vault holds OUSD managed by Archimedes under all positions.
/// @notice It Uses ER4626 to mint shares for deposited OUSD.
contract VaultOUSD is ERC4626Upgradeable, AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ParameterStore internal _paramStore;
    IERC20Upgradeable internal _ousd;

    uint256 internal _assetsHandledByArchimedes;

    fallback() external {
        revert("VaultOUSD : Invalid access");
    }

    function setDependencies(address _addressParamStore, address _addressOUSD) external onlyAdmin {
        _paramStore = ParameterStore(_addressParamStore);
        _ousd = IERC20Upgradeable(_addressOUSD);
    }

    function archimedesDeposit(uint256 assets, address receiver) external nonReentrant onlyExecutive returns (uint256) {
        _takeRebaseFees();
        _assetsHandledByArchimedes += assets;
        return deposit(assets, receiver);
    }

    function archimedesRedeem(
        uint256 shares,
        address receiver,
        address owner
    ) external nonReentrant onlyExecutive returns (uint256) {
        _archimedesRedeem(shares, owner, receiver);
    }

    /// Used to block the unknown use of redeem without archimedesRedeem
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override nonReentrant onlyExecutive returns (uint256) {
        _archimedesRedeem(shares, receiver, owner);
    }

    function _archimedesRedeem(
        uint256 shares,
        address receiver,
        address owner
    ) private nonReentrant returns (uint256) {
        _takeRebaseFees();
        uint256 redeemedAmountInAssets = redeem(shares, receiver, owner);
        _assetsHandledByArchimedes -= redeemedAmountInAssets;
        return redeemedAmountInAssets;
    }

    function takeRebaseFees() external nonReentrant onlyExecutive {
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

        _assetsHandledByArchimedes = 0;
    }

    function _takeRebaseFees() internal {
        uint256 roundingBuffer = 10; // wei
        console.log("totalAssets() - (_assetsHandledByArchimedes + roundingBuffer)", totalAssets(), _assetsHandledByArchimedes, roundingBuffer);
        if (totalAssets() > _assetsHandledByArchimedes) {
            // This is due to drifting in handeling assets. reset drift
            console.log("reseting drift in vault");
            _assetsHandledByArchimedes = totalAssets();
        }
        uint256 unhandledRebasePayment = totalAssets() - _assetsHandledByArchimedes + roundingBuffer;
        /// only run fee collection if there are some rebased funds not handled
        if (unhandledRebasePayment > roundingBuffer) {
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
