// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract PositionToken is ERC721, ERC721Burnable {
    constructor() ERC721("PositionToken", "PNT") {}

    /* Privileged functions: Executive  */

    /// @dev Mints NFT tokens to a recipient.
    ///
    /// This function reverts if the caller does not have the minter role.
    ///
    /// @param _recipient the account to mint tokens to.
    function mint(address _recipient, uint256 tokenId) external {
        _mint(_recipient, tokenId);
    }
}
