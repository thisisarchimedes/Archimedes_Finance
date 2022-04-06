// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/*
  Vault is just a simple in/out it provide a fixed (non upgradable) address to transfer OUSD and lvUSD to (and pay interest into).
  That means we need to change the architecture and add Minter or have the coordinator deal with than
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

/// @title Contract to hold and track OUSD funds owned by Archimedes
contract VaultOUSDLvUSD {
    address private oUSDContractAddress;
    address private lvUSDContractAddress;

    // The amount of OUSD deposited in the vault by customers or interest earned from OUSD that was already distributed among the positions. OUSD contract balanceOf can be different from oUSDRebasedBalance since interest earned but not distributed to positions is not included in "rebase" value
    uint256 private oUSDRebasedBalance;
    uint256 private lvUSDBalance;

    constructor(address oUSDContract, address lvUSDContract) {
        oUSDContractAddress = oUSDContract;
        lvUSDContractAddress = lvUSDContract;
        oUSDRebasedBalance = 0;
        lvUSDBalance = 0;
    }

    modifier nonZeroAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than zero");
        _;
    }

    /* Privileged functions: Executive  */

    /// @dev Deposits OUSD collateral into the vault.
    ///
    /// This function is only for the initial principle Deposits. It adds amount to oUSDRebasedBalance
    /// Partners use ERC20 transfer to send OUSD as interest
    ///
    /// @param from address from which we transfer OUSD to vault .
    /// @param amount the amount of collateral to deposit.
    function depositOUSD(address from, uint256 amount)
        external
        nonZeroAmount(amount)
    {
        // Transfer funds from OUSD to Vault contract address
        IERC20(oUSDContractAddress).transferFrom(from, address(this), amount);
        addRebasedOUSDBalance(amount);
    }

    /// @dev Withdraw OUSD from vault and transfer it to an address.
    ///
    /// This function reverts if a deposit into the CDP was made in the same block. This is to prevent flash loan attacks
    /// on other internal or external systems.
    ///
    /// It remove amount to oUSDRebasedBalance
    ///
    /// @param to address to transfer OUSD to.
    /// @param amount the amount of  OUSD collateral to withdraw.
    function withdrawOUSD(address to, uint256 amount)
        external
        nonZeroAmount(amount)
    {
        require(
            oUSDRebasedBalance >= amount,
            "Insufficient funds in Vault"
        );
        console.log("Vault:withdrawOUSD:oUSDRebasedBalance = %s", oUSDRebasedBalance);
        /// Approve amount, then approve back to zero
        IERC20(oUSDContractAddress).approve(address(this), amount);
        IERC20(oUSDContractAddress).transferFrom(address(this), to, amount);
        /// redundant as we used all the allowance but being extra careful
        IERC20(oUSDContractAddress).approve(address(this), 0);
        subtractRebasedOUSDBalance(amount);
    }

    /// @dev Deposits lvUSD into the vault.
    ///
    /// @param from address from which we transfer lvUSD to vault .
    /// @param amount the amount of lvUSD collateral to deposit.
    function depositLvUSD(address from, uint256 amount)
        external
        nonZeroAmount(amount)
    {
        IERC20(lvUSDContractAddress).transferFrom(from, address(this), amount);
        addLvUSDBalance(amount);
    }

    /// @dev Withdraw lvUSD from vault and transfer it to an address.
    ///
    /// @param to address to transfer lvUSD to.
    /// @param amount the amount of lvUSD collateral to withdraw.
    function withdrawLvUSD(address to, uint256 amount)
        external
        nonZeroAmount(amount)
    {
        require(lvUSDBalance >= amount, "Insufficient funds in Vault");
        /// Approve amount, then approve back to zero
        IERC20(lvUSDContractAddress).approve(address(this), amount);
        IERC20(lvUSDContractAddress).transferFrom(address(this), to, amount);
        /// redundant as we used all the allowance but being extra careful
        IERC20(lvUSDContractAddress).approve(address(this), 0);
        subtractLvUSDBalance(amount);
    }

    /// @dev get overall OUSD balance in vault
    function getVaultOUSDBalance() external view returns (uint256) {
        return oUSDRebasedBalance;
    }

    /// @dev get overall lvUSD balance in vault
    function getVaultLvUSDBalance() external view returns (uint256) {
        return lvUSDBalance;
    }

    /* Internal methods */

    function addRebasedOUSDBalance(uint256 amount) internal {
        oUSDRebasedBalance += amount;
    }

    function subtractRebasedOUSDBalance(uint256 amount) internal {
        oUSDRebasedBalance -= amount;
    }

    function addLvUSDBalance(uint256 amount) internal {
        lvUSDBalance += amount;
    }

    function subtractLvUSDBalance(uint256 amount) internal {
        lvUSDBalance -= amount;
    }
}
