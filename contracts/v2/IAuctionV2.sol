// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
lvUSD allocation concepts:
* There is lvUSD bank that holds the entire global lvUSD allocation available. 
  Also, each auction has lvUSD allocation. When taking leverage there need to be enough global lvUSD in the bank and "local" auction lvUSD allocation available

* Smart contract is expected to be precise. We add "dust" and buffering on the frontend side.
**/

interface IAuctionV2 {
    enum AuctionStatus {
        PENDING, // Auction is configured and going to start in the future
        RUNNING, // Auction is running
        EMPTY, // Auction run out of lvUSD allocation (no more leverage is available)
        FLOOR, // Auction is still open, but price reached floor and isn't going to drop anymore
        CLOSED // Auction is done - users can't take more leverage
    }

    struct AuctionDetails {
        uint16 auctionId;
        uint256 startBlock;
        uint256 floorBlock;
        uint256 closeBlock;
        uint256 startPrice;
        uint256 floorPrice;
        uint256 leverageAllocated; // lvUSD allocated to this auction
        uint256 leverageSpent; // lvUSD that was bought by users (when reach leverageAllocation auction moves to EMPTY status)
    }

    event createdAuction(
        uint16 indexed auctionId,
        uint256 startBlock,
        uint256 floorBlock,
        uint256 closeBlock,
        uint256 startPrice,
        uint256 floorPrice,
        uint256 leverageAllocated
    );

    event forcedClosedAuction(uint16 indexed auctionId);

    /// This event will be fired when the user takes all the local lvUSD allocation for this auction
    // There might still be lvUSD in the bank when we fire this event 
    event leverageAllocationSpent(uint16 indexed auctionId);

    // **************************************************************** //
    //            Auction managment methods                             //
    // **************************************************************** //

    /// Set an auction starting at start block (which could be in the future)
    /// When we reach close block, no leverage can be taken
    /// Price change is linear (block by block)
    /// This is an admin function
    /// Admin cannot create a new auction while an auction is running - call closeAuction first.
    /// Note: revert create auction when there is an Pending, running or ended auction (auction must be closed in order to create new one)
    function createAuction(
        uint256 startBlock, // Start block must be in the future (otherwise it reverts)
        uint256 floorBlock, // On this block we get to the endPrice (a.k.a. floor price) - auction still open but price is not going down anymore
        uint256 closeBlock, // On this block auction is close - users cannot take more leverage (even if there is more lvUSD allocation left)
        uint256 startPrice, // how much lvUSD for 1 ARCH  - for example 1 arch is worth 30 lvUSD
        uint256 floorPrice, // for example 1 ARCH is now worth 50 lvUSD
        uint256 leverageAllocated // how much lvUSD is allocated for this auction
    ) external;

    // closing an auction entials updating status to CLOSED
    // it is an admin function. Admin can call it at any point
    // Note : when guardian pauses  system, close auction using this method.
    function closeAuction() external;

    // **************************************************************** //
    //            Auction buy methods                                   //
    // **************************************************************** //

    // 1) Take ARCH from user and send it to treasury
    // 2) Take lvUSD from bank and earmark it for the user to take leverage on
    // This is an internal function. There isn't going to be a "free flowing" lvUSD in user's wallet
    // leverageAmountToGet - how much leverage is being bought
    // leverageToAddress - The contract address that gets the lvUSD to later use to create a leveraged position
    // archFromAddress - The address of the user that pays ARCH tokens for the position
    // The amount of arch Tokens transferred is calculated based on leverageAmount
    // function must double check that current auction has allocation and that the lvUSD bank has global lvUSD allocation (contract doesn't hold lvUSD it takes it from the lvUSD bank)
    function buyLeverage(uint256 leverageAmountToGet, address leverageToAddress, address archFromAddress) external;

    // **************************************************************** //
    //            Auction informational methods                         //
    // **************************************************************** //

    /// preview how much arch needs to be payed for leverageAmount (lvUSD allocation)
    /// For example, if each arch is worth 100 lvUSD, calling method with leverageAmount == 200 will return 2 (ie 2 Arch tokens)
    /// We use this function for approval. We should approve a bit more so user won't revert.
    function getArchNeeded(uint256 leverageAmountToGet) external view returns (uint256 leveragePriceInArch);

    // returns how much lvUSD we can get for 1 ARCH. This is basically current auction price
    function getCurrentArchToLeveragePrice() external view returns (uint256 auctiontArchToLeveragePrice);

    function getAuctionStatus() external view returns (AuctionStatus);

    // returns the min lvUSD allocation between what left in the bank and the allocation for this specific auction
    function getLeverageLeftOnAuction() external view returns (uint256);

    // labeling the auction instance name so we know what we are dealing with (like: "OUSD 1 year")
    function getAuctionName() external view returns (string memory);

    // **************************************************************** //
    //            Auction details getters methods                       //
    // **************************************************************** //


}
