// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IAuction} from "../contracts/interfaces/IAuction.sol";
import {AccessController} from "./AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract Auction is IAuction, AccessController, UUPSUpgradeable {
    /// access control variables. In V2 move to dedicated lib/class
    bytes32 public constant AUCTIONEER = keccak256("AUCTIONEER");
    address internal _addressAuctioneer;
    // ^^end access control variables

    uint256 internal _currentAuctionId;
    uint256 internal _startBlock;
    uint256 internal _endBlock;
    uint256 internal _startPrice;
    uint256 internal _endPrice;

    bool internal _isAuctionClosed;

    function startAuctionWithLength(
        uint256 length,
        uint256 startPrice,
        uint256 endPrice
    ) external override onlyAuctioneer {
        uint256 endBlock = block.number + length;
        _startAuction(endBlock, startPrice, endPrice);
    }

    function startAuction(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) external override onlyAuctioneer {
        _startAuction(endBlock, startPrice, endPrice);
    }

    function _startAuction(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) internal {
        require(isAuctionClosed() == true, "err:auction currently running");
        _validateAuctionParams(endBlock, startPrice, endPrice);
        _setAuctionPrivateMembers(endBlock, startPrice, endPrice);
        _emitAuctionStart();
        _isAuctionClosed = false;
    }

    function stopAuction() external onlyAuctioneer {
        _isAuctionClosed = true;
        _emitAuctionForcedStopped();
    }

    function getCurrentBiddingPrice() external view override returns (uint256 auctionBiddingPrice) {
        /// If reached endBlock , handle auction that is "closed"
        /// ELSE calculate current price for an open auction.
        // console.log("endBlock %s currentBlock %s", _endBlock, block.number);
        uint256 biddingPrice;
        if (isAuctionClosed()) {
            biddingPrice = _getCurrentPriceClosedAuction();
        } else {
            biddingPrice = _calcCurrentPriceOpenAuction();
        }
        // sanity and security check
        if (biddingPrice == 0) {
            revert("err:biddingPrice cant be 0");
        } else {
            return biddingPrice;
        }
    }

    /// calc methods

    function _getCurrentPriceClosedAuction() internal view returns (uint256 auctionPrice) {
        return _endPrice;
    }

    function _calcCurrentPriceOpenAuction() internal view returns (uint256 auctionPrice) {
        /// y = ax + b
        /// => y = current auction price.
        /// linear graph show price in Y and price is going down over time so we'll need y = -ax + b
        /// might be easier to think about this as y = b - ax
        /// time is the X axis here so when we start auction t=0, when we end t=delt(startBlock, endBlock)
        /// we want to get time that is between 0 and 1 so we'll do
        /// so this means t_current = (currentBlock - startBlock)/delta(startBlock, endBlock)
        /// b = startPrice. b has to equal startPrice since t=0 at that point
        /// a = (startingPrice - endPrice)
        // currentPrice =  b - ax = startPrice - (startingPrice - endPrice) * t(0...1 only)
        uint256 deltaInPrices = _endPrice - _startPrice;
        uint256 deltaInPriceMulCurrentTime = (deltaInPrices * (block.number - _startBlock)) / (_endBlock - _startBlock);
        uint256 maxPriceForAuction = _startPrice;
        uint256 currentPrice = maxPriceForAuction + deltaInPriceMulCurrentTime;

        return currentPrice;
    }

    /// helper methods

    function isAuctionClosed() public view returns (bool) {
        if (_isAuctionClosed == true || _endBlock < block.number) {
            return true;
        } else {
            return false;
        }
    }

    function _validateAuctionParams(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) internal view {
        require(endBlock > block.number, "err:endBlock<=block.number");
        require(startPrice > 0, "err:start price cant be 0");
        require(startPrice < endPrice, "err:startPrice>endPrice");
    }

    function _setAuctionPrivateMembers(
        uint256 endBlock,
        uint256 startPrice,
        uint256 endPrice
    ) internal {
        _currentAuctionId = _currentAuctionId + 1;
        _startBlock = block.number;
        _endBlock = endBlock;
        _startPrice = startPrice;
        _endPrice = endPrice;
    }

    function _emitAuctionStart() internal {
        emit AuctionStart(_currentAuctionId, _startBlock, _endBlock, _startPrice, _endPrice);
    }

    function _emitAuctionForcedStopped() internal {
        emit AuctionForcedStopped(_currentAuctionId);
    }

    /// Deplyment functionality
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
        setAuctioneer(_msgSender());
        _isAuctionClosed = true;
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function setAuctioneer(address newAuctioneer) public onlyAdmin {
        address oldAuctioneer = _addressAuctioneer;
        require(oldAuctioneer != newAuctioneer, "New Auctioneer must be diff");
        _grantRole(AUCTIONEER, newAuctioneer);
        _revokeRole(AUCTIONEER, oldAuctioneer);
        _addressAuctioneer = newAuctioneer;
    }

    modifier onlyAuctioneer() {
        require(hasRole(AUCTIONEER, msg.sender), "Caller is not Auctioneer");
        _;
    }
}
