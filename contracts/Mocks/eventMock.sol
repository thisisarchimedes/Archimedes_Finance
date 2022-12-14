// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC721, Ownable {
    constructor() ERC721("MyToken", "MTK") {}

    event PositionCreated(
        address indexed _from,
        uint256 indexed _positionId,
        uint256 _princple,
        uint256 _levTaken,
        uint256 _archBurned,
        uint256 _positionExp
    );

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
        uint256 blockTimestamp = block.timestamp;
        uint256 positionTimeToLive = 369;
        uint256 positionEndDate = blockTimestamp + positionTimeToLive * 1 days;
        emit PositionCreated(msg.sender, tokenId, 120 ether, 700 ether, 33 ether, positionEndDate);
    }
}
