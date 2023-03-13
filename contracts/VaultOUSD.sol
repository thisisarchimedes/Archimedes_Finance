// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {AccessController} from "./AccessController.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IOUSD} from "./interfaces/IOUSD.sol";
import "hardhat/console.sol";

/// @title Archimedes OUSD vault
/// @notice Vault holds OUSD managed by Archimedes under all positions.
/// @notice It Uses ER4626 to mint shares for deposited OUSD.
contract VaultOUSD is ERC4626Upgradeable, AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ParameterStore internal _paramStore;
    IOUSD internal _ousd;

    uint256 internal _assetsHandledByArchimedes;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */

    uint256[44] private __gap;

    fallback() external {
        revert("VaultOUSD : Invalid access");
    }

    function setDependencies(address _addressParamStore, address _addressOUSD) external onlyAdmin {
        require(_addressParamStore != address(0), "cant set to 0 A");
        require(_addressOUSD != address(0), "cant set to 0 A");

        _paramStore = ParameterStore(_addressParamStore);
        _ousd = IOUSD(_addressOUSD);
        _optInForRebases();
    }

    function archimedesDeposit(uint256 assets, address receiver) external nonReentrant onlyExecutive returns (uint256) {
        _takeRebaseFees();
        _assetsHandledByArchimedes += assets;
        return super.deposit(assets, receiver);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        revert("call ArchimedesRedeem instead");
    }

    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        revert("call ArchimedesDeposit instead");
    }

    function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
        revert("cant mint on vault");
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        revert("cant withdraw on vault");
    }
    
    function archimedesRedeem(
        uint256 shares,
        address receiver,
        address owner
    ) external nonReentrant onlyExecutive returns (uint256) {
        _takeRebaseFees();
        uint256 redeemedAmountInAssets = super.redeem(shares, receiver, owner);
        /// This is due to integer rounding issues. If this is the case, reset _assetsHandledByArchimedes
        if (_assetsHandledByArchimedes < redeemedAmountInAssets) {
            _assetsHandledByArchimedes = 0;
        } else {
            _assetsHandledByArchimedes = _assetsHandledByArchimedes - redeemedAmountInAssets;
        }
        return redeemedAmountInAssets;
    }

    function takeRebaseFees() external nonReentrant onlyAdmin {
        _takeRebaseFees();
    }

    function _optInForRebases() internal {
        _ousd.rebaseOptIn();
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IERC20MetadataUpgradeable asset,
        string memory name,
        string memory symbol
    ) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());

        __ERC4626_init(asset);
        __ERC20_init(name, symbol);

        _assetsHandledByArchimedes = 0;
    }

    function _takeRebaseFees() internal {
        uint256 roundingBuffer = 100; // wei

        // If for some reason, _assetsHandledByArchimedes is larger then total assets, reset _assetsHandledByArchimedes to max (ie total assets)
        uint256 totalAssetsCurrent = totalAssets();
        if (totalAssetsCurrent < _assetsHandledByArchimedes) {
            if (_assetsHandledByArchimedes - totalAssetsCurrent > 1000) {
                revert("Err:ArchAssets > totalA");
            }
            // This is due to drifting in handling assets. reset drift
            // console.log("reseting drift in vault _assetsHandledByArchimedes %s, total assets %s", _assetsHandledByArchimedes, totalAssetsCurrent);
            _assetsHandledByArchimedes = totalAssetsCurrent;
        }

        // Another layer of securing from rounding errors - round down last 2 digits if possible
        uint256 unhandledRebasePayment;
        if ((totalAssets() - _assetsHandledByArchimedes) > 100) {
            unhandledRebasePayment = ((totalAssets() - _assetsHandledByArchimedes) / 100) * 100;
        } else {
            unhandledRebasePayment = 0;
        }

        /// only run fee collection if there are some rebased funds not handled (pad by rounding buffer)
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
