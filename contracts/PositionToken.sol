// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {AccessController} from "./AccessController.sol";

contract PositionToken is ERC721, ERC721Burnable, AccessController {
    using Counters for Counters.Counter;

    Counters.Counter private _positionTokenIdCounter;

    constructor(address admin) ERC721("PositionToken", "PNT") AccessController(admin) {}

    /* Privileged functions: Executive */
    function safeMint(address to) external onlyExecutive returns (uint256 positionTokenId) {
        positionTokenId = _positionTokenIdCounter.current();
        _positionTokenIdCounter.increment();
        _safeMint(to, positionTokenId);
        _setApprovalForAll(to, _getAddressExecutive(), true);
        return positionTokenId;
    }

    /* override burn to only allow executive to burn positionToken */
    function burn(uint256 positionTokenId) public override(ERC721Burnable) onlyExecutive {
        super.burn(positionTokenId);
    }

    function exists(uint256 positionTokenId) external view onlyExecutive returns (bool) {
        return _exists(positionTokenId);
    }

    /* Override required by Solidity: */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessController) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
