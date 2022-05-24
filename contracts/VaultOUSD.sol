// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "../contracts/interfaces/IERC4626.sol";
import {ERC4626} from "../contracts/standard/ERC4626.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

/// @title Archimedes OUSD vault
/// @notice Vault holds OUSD managed by Archimedes under all positions.
/// @notice It Uses ER4626 to mint shares for deposited OUSD.
contract VaultOUSD is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ParameterStore internal _paramStore;
    IERC20 internal _ousd;

    uint256 internal _assetsHandledByArchimedes = 0;

    constructor(
        IERC20Metadata asset,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) ERC4626(asset) {}

    function init(address _addressParamStore, address _addressOUSD) external {
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

    function _takeRebaseFees() internal {
        uint256 unhandledRebasePayment = totalAssets() - _assetsHandledByArchimedes;
        /// only run fee collection if there are some rebased funds not handled
        console.log("Vault: unhandledRebasePayment %s", unhandledRebasePayment / 1 ether);
        if (unhandledRebasePayment > 0) {
            uint256 feeToCollect = (unhandledRebasePayment * _paramStore.getRebaseFeeRate()) / 1 ether;
            console.log("Vault: FeeToCollectAfterRebase %s", feeToCollect / 1 ether);
            uint256 handledRebaseValueToKeepInVault = unhandledRebasePayment - feeToCollect;

            _assetsHandledByArchimedes += handledRebaseValueToKeepInVault;

            _ousd.transfer(_paramStore.getTreasuryAddress(), feeToCollect);
        }
    }
}
