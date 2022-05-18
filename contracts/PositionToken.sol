// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PositionToken is ERC721, ERC721Burnable, ERC721Enumerable, AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _positionTokenIdCounter;

    address private _addressLeverageEngine;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTIVE_ROLE = keccak256("EXECUTIVE_ROLE");

    bool internal _initialized = false;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "onlyAdmin: Caller is not admin");
        _;
    }

    modifier onlyExecutive() {
        require(hasRole(EXECUTIVE_ROLE, msg.sender), "onlyExecutive: Caller is not executive");
        _;
    }

    modifier expectInitialized() {
        require(_initialized, "expectInitialized: contract is not initialized");
        _;
    }

    constructor(address admin) ERC721("PositionToken", "PNT") {
        _setupRole(ADMIN_ROLE, admin);
    }

    function init(address leverageEngine) external nonReentrant onlyAdmin {
        _setupRole(EXECUTIVE_ROLE, leverageEngine);
        _addressLeverageEngine = leverageEngine;
        _initialized = true;
    }

    /* Privileged functions: Executive */
    function safeMint(address to) external nonReentrant expectInitialized onlyExecutive returns (uint256 positionTokenId) {
        positionTokenId = _positionTokenIdCounter.current();
        _positionTokenIdCounter.increment();
        _safeMint(to, positionTokenId);
        _setApprovalForAll(to, _addressLeverageEngine, true);
        return positionTokenId;
    }

    /* override burn to only allow executive to burn positionToken */
    function burn(uint256 positionTokenId) public override(ERC721Burnable) nonReentrant expectInitialized onlyExecutive {
        super.burn(positionTokenId);
    }

    function exists(uint256 positionTokenId) external view expectInitialized onlyExecutive returns (bool) {
        return _exists(positionTokenId);
    }

    /* Overrides required by Solidity: */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        return super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
