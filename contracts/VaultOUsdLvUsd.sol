pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


contract VaultOUsdLvUsd is AccessControl {

  using SafeERC20 for ERC20;

  constructor(
    ERC20 _tokenOUSD,
    ERC20 _tokenLVUSD) {

      // Grant the contract deployer the default admin role and minter role
      _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
      _grantRole(COORDINATOR_ROLE, msg.sender);

      // initializing OUSD and lvUSD vault balance
      balanceOUSD = 0;
      balanceLVUSD = 0;

      tokenOUSD = _tokenOUSD;
      tokenLVUSD = _tokenLVUSD;
  }

  //////////////////////////* Access Control */////////////////////////////
  bytes32 public constant COORDINATOR_ROLE = keccak256("COORDINATOR_ROLE");

  /// @dev Set minter
  ///
  /// Set controller
  ///
  /// @param _coordinator new address
  function setCoordinator(address _coordinator) external {
   require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
   grantRole(COORDINATOR_ROLE, _coordinator);
  }

  /// @dev Revoke minter
  ///
  /// Set controller
  ///
  /// @param _coordinator to revoke address
  function revokeCoordinator(address _coordinator) external {
   require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
   revokeRole(COORDINATOR_ROLE, _coordinator);
  }

  //////////////////////////* Vault management */////////////////////////////
  uint256 private balanceOUSD;
  uint256 private balanceLVUSD;

  ERC20 private tokenOUSD;
  ERC20 private tokenLVUSD;


  /// @dev Deposits OUSD collateral into the vault.
  /// Privileged access - only the contract owner (the leverage engine) can deposit
  ///
  /// This function is only for the initial principle Deposits
  /// Partners use ERC20 transfer to send OUSD as interest
  ///
  /// @param _amount the amount of collateral to deposit.
  function depositOUSD(uint256 _amount) external {

    require(hasRole(COORDINATOR_ROLE, msg.sender), "Caller is not a Coordinator");

    tokenOUSD.safeTransferFrom(msg.sender, address(this), _amount);
    balanceOUSD = balanceOUSD + _amount;

  }

  /// @dev Withdraw OUSD collateral into the vault.
  /// Privileged access - only the contract owner (the leverage engine) can deposit
  ///
  /// This function is only for the initial principle Deposits
  /// Partners use ERC20 transfer to send OUSD as interest
  ///
  /// @param _amount the amount of collateral to deposit.
  function withdrawOUSD(uint256 _amount) external {

    require(hasRole(COORDINATOR_ROLE, msg.sender), "Caller is not a Coordinator");

    tokenOUSD.safeTransferFrom(address(this), msg.sender, _amount);
    balanceOUSD = balanceOUSD - _amount;

  }



}
