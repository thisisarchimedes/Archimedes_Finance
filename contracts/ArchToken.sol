// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {BasicAccessController} from "../contracts/BasicAccessController.sol";

/**
@title Archimedes Governance token
@notice contract is ERC20Permit and ERC20Votes to allow voting
 **/
 
contract ArchToken is ERC20, BasicAccessController, ERC20Permit, ERC20Votes {
    constructor(address _addressTreasury) ERC20("Archimedes", "ARCH") ERC20Permit("ArchToken") {
        _mint(_addressTreasury, 100000000 ether);
        _grantRole(ADMIN_ROLE, _msgSender());
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
