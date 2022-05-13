// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "../contracts/interfaces/IERC4626.sol";
import {ERC4626} from "../contracts/standard/ERC4626.sol";
import {ParameterStore} from "./ParameterStore.sol";
import "hardhat/console.sol";

/// @title Archimedes OUSD vault
/// @notice Vault holds OUSD managed by Archimedes under all positions.
/// @notice It Uses ER4626 to mint shares for deposited OUSD.
contract VaultOUSD is ERC4626 {
    using SafeERC20 for IERC20;

    ParameterStore internal _paramStore;
    IERC20 internal _ousd;

    uint256 internal _assetsHandledByArchimedes;

    constructor(
        IERC20Metadata asset,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) ERC4626(asset) {}

    function init(address _addressParamStore, address _addressOUSD) external {
        _paramStore = ParameterStore(_addressParamStore);
        _assetsHandledByArchimedes = 0;
        _ousd = IERC20(_addressOUSD);
    }

    function archimedesDeposit(uint256 assets, address receiver) external returns (uint256) {
        _assetsHandledByArchimedes += assets;
        return deposit(assets, receiver);
    }

    function archimedesRedeem(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256) {
        uint256 redeemedAmountInAssets = redeem(shares, receiver, owner);
        _assetsHandledByArchimedes -= redeemedAmountInAssets;
        return redeemedAmountInAssets;
    }

    function takeRebaseFees() external {
        /*
         assestsInVaultBeforeCollectingFees = 0
         assestsHandledByArchimedes = 0
         
         position 1 dep 100
         assestsInVaultBeforeCollectingFees = 100
         assestsHandledByArchimedes = 100

         position 2 dep 400

         assestsInVaultBeforeCollectingFees = 500
         assestsHandledByArchimedes = 500

         rebase event - OUSD add 100 more
         assestsInVaultBeforeCollectingFees = 600
         assestsHandledByArchimedes = 500  <--- notice this does not change! since no deposit was made (wrapper for deposits track this)

            we have 100 to take fees from, the rest is kep in the vault, not as deposited. let say we take 10% fee
            we log that we handled 90$ in rebase - we can mark them as assests deposited

        --- 

        assestsInVaultBeforeCollectingFees = 590
        assestsHandledByArchimedes = 590

        position 1 withdraws 100 shares ->  interest 0.2ofTotalShares*590TotalAssets = 118 . lets say 120 for simplicity 
        assestsInVaultBeforeCollectingFees = 590 - 120 = 470
        assestsHandledByArchimedes = 590 - 120 = 470

        position 3 dep 300 
        assestsInVaultBeforeCollectingFees = 470 + 300 = 770
        assestsHandledByArchimedes =  470 + 300 = 770

        rebase event - OUSD add 100 more
        assestsInVaultBeforeCollectingFees = 770 + 100 = 870
        assestsHandledByArchimedes =  770  <-- this does not change!

            feesToHandle = assestsInVaultBeforeCollectingFees - assestsHandledByArchimedes = 870 - 770 = 100
            we have 100 to take fees from, the rest is kep in the vault, not as deposited. let say we take 10% fee
            we log that we handled 90$ in rebase - we can mark them as assests deposited

        */
        uint256 unhandledRebasePayment = totalAssets() - _assetsHandledByArchimedes;
        uint256 feeToCollect = (unhandledRebasePayment * _paramStore.getRebaseFeeRate()) / 1 ether;
        uint256 handledRebaseValueToKeepInVault = unhandledRebasePayment - feeToCollect;

        _ousd.transfer(_paramStore.getTreasuryAddress(), feeToCollect);

        _assetsHandledByArchimedes += handledRebaseValueToKeepInVault;
    }
}
