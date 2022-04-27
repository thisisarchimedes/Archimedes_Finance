pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MintableToken is ERC20, Ownable {

   constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable() {
  
   }
  function mint(address _to, uint256 _amount) onlyOwner public returns (bool) {
    _mint(_to, _amount * 10**18);
    return true;	
    
  }
}
