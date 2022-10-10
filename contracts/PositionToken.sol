// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {AccessController} from "./AccessController.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract PositionToken is
    AccessController,
    ReentrancyGuardUpgradeable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _positionTokenIdCounter;

    event NFTCreated(uint256 indexed _positionId, address indexed _minter);
    event NFTBurned(uint256 indexed _positionId, address indexed _redeemer);
    /// mapping of address to which TokenID it owns (only used for viewing methods)

    mapping(address => uint256[]) internal _addressToTokensOwnedMapping;

    /* Privileged functions: Executive */
    function safeMint(address to) external onlyExecutive returns (uint256 positionTokenId) {
        positionTokenId = _positionTokenIdCounter.current();
        _positionTokenIdCounter.increment();
        _safeMint(to, positionTokenId);
        _setApprovalForAll(to, getAddressExecutive(), true);
        emit NFTCreated(positionTokenId, to);
        return positionTokenId;
    }

    function exists(uint256 positionTokenId) external view returns (bool) {
        return _exists(positionTokenId);
    }

    function initialize() public initializer {
        __ERC721_init("ArchimedesPositionToken", "APNT");
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    /* override burn to only allow executive to burn positionToken */
    function burn(uint256 positionTokenId) public override(ERC721BurnableUpgradeable) nonReentrant onlyExecutive {
        super.burn(positionTokenId);
        emit NFTBurned(positionTokenId, msg.sender);
    }

    /* Override required by Solidity: */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* Override required by Solidity: */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        uint256 tokenIdArrayIndex;
        // remove prev owner from _addressToTokensOwnedMapping only if this is not from this contract (ie new position) and mapping exist
        // console.log("_beforeTokenTransfer from %s, to %s, tokenId %s", from, to, tokenId);
        if (from != address(this) && _addressToTokensOwnedMapping[from].length != 0) {
            // console.log("_beforeTokenTransfer from %s, to %s, tokenId %s", from, to, tokenId);
            for (uint256 i = 0; i < _addressToTokensOwnedMapping[from].length; i++) {
                if (_addressToTokensOwnedMapping[from][i] == tokenId) {
                    tokenIdArrayIndex = i;
                    uint256 lastTokenIdInArray = _addressToTokensOwnedMapping[from][_addressToTokensOwnedMapping[from].length - 1];
                    _addressToTokensOwnedMapping[from][tokenIdArrayIndex] = lastTokenIdInArray;
                    _addressToTokensOwnedMapping[from].pop();
                    break;
                }
            }
        }

        return super._beforeTokenTransfer(from, to, tokenId);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable) {
        super._afterTokenTransfer(from, to, tokenId);

        // Add tokenID from To address to _addressToTokensOwnedMapping
        // console.log("AfterTokenTransfer from %s, to %s, tokenId %s", from, to, tokenId);
        if (to != address(0)) {
            _addressToTokensOwnedMapping[to].push(tokenId);
        }

        /// set approval for executive to interact with tokenID
        _setApprovalForAll(to, getAddressExecutive(), true);
    }

    function getTokenIDsArray(address owner) external view returns (uint256[] memory) {
        uint256[] memory arrayToReturn = _addressToTokensOwnedMapping[owner];
        return arrayToReturn;
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    fallback() external {
        revert("PositionToken : Invalid access");
    }
}
