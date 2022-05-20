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

    constructor(address admin) ERC721("PositionToken", "PNT") AccessController(admin) {}

    function init() external initializer onlyAdmin {}

    /* Privileged functions: Executive */
    function safeMint(address to) external onlyExecutive returns (uint256 positionTokenId) {
        positionTokenId = _positionTokenIdCounter.current();
        _positionTokenIdCounter.increment();
        _safeMint(to, positionTokenId);
        _setApprovalForAll(to, _getAddressExecutive(), true);
        return positionTokenId;
    }

    /* override burn to only allow executive to burn positionToken */
    function burn(uint256 positionTokenId) public override(ERC721Burnable) nonReentrant expectInitialized onlyExecutive {
        super.burn(positionTokenId);
    }

    function exists(uint256 positionTokenId) external view expectInitialized returns (bool) {
        return _exists(positionTokenId);
    }

    // mapping(address => uint256) private shares;

    // function b() external {
    //     uint256 amount = shares[msg.sender];
    //     shares[msg.sender] = 0;
    //     bool a = msg.sender.send(amount);
    //     if (a) {
    //         shares[msg.sender] = 0;
    //     }
    // }

    /* Overrides required by Solidity: */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        return super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessController, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
