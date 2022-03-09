pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title lvUSD token
///
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
///
/// Not implementation just external facing interfaces
///
contract LvUsdToken is ERC20, AccessControl {
  using SafeERC20 for ERC20;

  /* Access Control */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor() ERC20("Archimedes lvUSD", "lvUSD") {

      // Grant the contract deployer the default admin role and minter role
      _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
      _grantRole(MINTER_ROLE, msg.sender);
  }

  /// @dev Set minter
  ///
  /// Set minter
  ///
  /// @param _minter new minter address
 function setMinter(address _minter) external {
   require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
   grantRole(MINTER_ROLE, _minter);
 }

 /// @dev Revoke minter
 ///
 /// Set minter
 ///
 /// @param _minter to revoke minter address
 function revokeMinter(address _minter) external {
   require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not an admin");
   revokeRole(MINTER_ROLE, _minter);
 }

  /// @dev mint new lvUSD tokens
  ///
  /// This function reverts if the caller does not have the Owner role.
  ///
  /// @param _recipient the account to mint tokens to.
  /// @param _amount    the amount of tokens to mint.
  function mint(address _recipient, uint256 _amount) external  {

    // Access Control
    require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");

    _mint(_recipient, _amount);

  }

}


/* TODO: Add timelock on admin actions */
