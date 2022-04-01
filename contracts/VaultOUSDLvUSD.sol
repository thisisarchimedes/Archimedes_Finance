// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/*
  Vault is just a simple in/out it provide a fixed (non upgradable) address to transfer OUSD to (and pay interest into).
  That means we need to change the architecture and add Minter or have the coordinator deal with than
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";



contract VaultOUSDLvUSD is ERC20("Archimedes oUSDVault", "VaultUsd") {
    // Total oUSD sum in vault after last rebase (i.e handing out interest to positions)
    uint256 private oUSDRebasedAmount;

    /* Privileged functions: Executive  */

    /// @dev Deposits collateral into the vault.
    ///
    /// This function is only for the intial principle Deposits. It adds amount to oUSDRebasedAmount
    /// Partners use ERC20 transfer to send OUSD as interest
    ///
    /// @param amount the amount of collateral to deposit.
    function depositOUSD(uint256 amount) external {
        
    }


    /// @dev Attempts to withdraw part of a CDP's collateral.
    ///
    /// This function reverts if a deposit into the CDP was made in the same block. This is to prevent flash loan attacks
    /// on other internal or external systems.
    ///
    /// It remove amount to oUSDRebasedAmount
    ///
    /// @param amount the amount of collateral to withdraw.
    function withdraw(uint256 amount) external returns (uint256) ;

  }
