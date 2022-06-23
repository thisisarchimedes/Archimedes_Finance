// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {AccessController} from "./AccessController.sol";

contract PositionToken is ERC721, ERC721Burnable, ERC721Enumerable, AccessController {
    using Counters for Counters.Counter;

    Counters.Counter private _positionTokenIdCounter;

    event NFTCreated(uint256 indexed _positionId, address indexed _minter);
    event NFTBurned(uint256 indexed _positionId, address indexed _redeemer);

    constructor(address admin) ERC721("PositionToken", "PNT") AccessController(admin) {}

    function init() external initializer onlyAdmin {}

    /* Privileged functions: Executive */
    function safeMint(address to) external onlyExecutive returns (uint256 positionTokenId) {
        positionTokenId = _positionTokenIdCounter.current();
        _positionTokenIdCounter.increment();
        _safeMint(to, positionTokenId);
        _setApprovalForAll(to, _getAddressExecutive(), true);
        emit NFTCreated(positionTokenId, to);
        return positionTokenId;
    }

    function exists(uint256 positionTokenId) external view expectInitialized returns (bool) {
        return _exists(positionTokenId);
    }

    /* override burn to only allow executive to burn positionToken */
    function burn(uint256 positionTokenId) public override(ERC721Burnable) nonReentrant expectInitialized onlyExecutive {
        super.burn(positionTokenId);
        emit NFTBurned(positionTokenId, msg.sender);
    }

    /* Override required by Solidity: */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessController, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /* Override required by Solidity: */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        return super._beforeTokenTransfer(from, to, tokenId);
    }
}
