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
        return super._beforeTokenTransfer(from, to, tokenId);
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    fallback() external {
        revert("PositionToken : Invalid access");
    }
}
