pragma solidity 0.8.4;


//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/// @title lvUSD token
///
/// @dev This is the contract for the Archimedes lvUSD USD pegged stablecoin
///
/// Not implementation just external facing interfaces
///
contract LvUsdToken is ERC20("Archimedes lvUSD", "lvUSD"), Ownable {
  using SafeERC20 for ERC20;




  ///
  /// This function reverts if the caller does not have the minter role.
  ///
  /// @param _recipient the account to mint tokens to.
  /// @param _amount    the amount of tokens to mint.
  function mint(address _recipient, uint256 _amount) onlyOwner external  {

    // extra check - just owner can mint and only to itself
    require(_recipient == owner());


    _mint(_recipient, _amount);


  }




}
