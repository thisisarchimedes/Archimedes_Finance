pragma solidity ^0.8.4;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";



/// @title lvUSD token
///
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
///
/// Not implementation just external facing interfaces
///
contract LvUsdToken is ERC20("Archimedes lvUSD", "lvUSD") {




  ///
  /// This function reverts if the caller does not have the minter role.
  ///
  /// @param _recipient the account to mint tokens to.
  /// @param _amount    the amount of tokens to mint.
  function mint(address _recipient, uint256 _amount) external  {


  }




}
