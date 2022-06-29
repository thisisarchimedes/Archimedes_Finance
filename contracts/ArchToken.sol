// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
@title Archimedes Governance token
@notice contract is ERC20Permit and ERC20Votes to allow voting
@notice to keep token tight and simple, use Ownable instead of AccessControl module
 **/
contract ArchToken is ERC20, Ownable, ERC20Permit, ERC20Votes {
    constructor(address _addressTreasury) ERC20("Archimedes", "ARCH") ERC20Permit("ArchToken") {
        _mint(_addressTreasury, 100000000 ether);
    }

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}
