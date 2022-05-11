// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PositionToken is ERC721, ERC721Burnable, AccessControl {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTIVE_ROLE = keccak256("EXECUTIVE_ROLE");

    bool internal _initialized = false;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "onlyAdmin: Caller is not admin");
        _;
    }

    modifier onlyExecutive() {
        require(hasRole(ADMIN_ROLE, msg.sender), "onlyMinter: Caller is not executive");
        _;
    }

    modifier expectInitialized() {
        require(_initialized, "expectInitialized: contract is not initialized");
        _;
    }

    constructor(address admin) ERC721("PositionToken", "PNT") {
        _setupRole(ADMIN_ROLE, admin);
    }

    function init(address leverageEngine) public onlyAdmin {
        _setupRole(EXECUTIVE_ROLE, leverageEngine);
        _initialized = true;
    }

    /* Privileged functions: Executive */
    function safeMint(address to) public onlyExecutive returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
    }

    /* Override required by Solidity: */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
