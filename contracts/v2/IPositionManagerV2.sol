// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
 * This is the main user facing contract
 *
 * Each strategy (like: OUSD 1 year) has its own PositionManagerV2 contract instance (and also its own AuctionV2 instance)
 **/
interface IPositionManagerV2 {
    //  address indexed owner - the address that got the NFT
    //  uint256 leverageTaken - lvUSD dominated debt
    event PositionCreated(
        address indexed owner,
        uint256 indexed positionId,
        uint256 collateral,
        uint256 leverageTaken,
        uint256 expirationDate,
        uint8 indexed strategyIndex
    );

    // windfall: collateral + profit ( - all the fees)
    event PositionUnwind(address indexed owner, uint256 indexed positionId, uint256 windfall, uint8 strategyIndex);
    event PositionExpired(address indexed owner, uint256 indexed positionId, uint8 strategyIndex);
    event PositionForceClosed(address indexed owner, uint256 indexed positionId, uint8 strategyIndex); /// TODO : think about what we do when liquidating
    event PositionClaimed(address indexed owner, uint256 indexed positionId, uint256 ownerWindfall, uint8 strategyIndex);

    // **************************************************************** //
    //           Creation and unwind methods                            //
    // **************************************************************** //

    /// Function will check if leverage requested is valid for given collateral and "cycles"
    /// Assume that msg.sender approved enough ArchTokens to open positions
    /// Checks that collateralAmount and leverageAmount meets the strategy parameters
    ///
    /// PositionManagerV2-->AuctionV2:
    ///
    /// 1) User has 1000 OUSD ; 10 ARCH ; 0 lvUSD
    /// 2) User approves 10 Arch for PositionManager to spend (or infinite Arch)
    /// 3) User call createPosition(1000, 7000);
    /// 4) Position manager bids on Leverage and gets it
    /// 5) create leveraged position
    ///
    /// collateralAmount - how much collateral user is sending
    /// leverageAmountRequested - at most the max leverage allowed by the strategy.
    ///                           The downstream AuctionV2.buyLeverage() takes the needed amount of ARCH to support the position
    /// This is a PUBLIC method.
    function createPosition(uint256 collateralAmount, uint256 leverageAmountRequested) external returns (uint256 positionId);

    /// it checks that the caller has the NFT
    ///
    /// function reverts if there isn't enough value to repay all lvUSD debt
    /// we burn the lvUSD after repaying the debt
    function unwindPosition(uint256 positionId) external;

    // Deal with position unwind by non users
    // public function - sets a flag and set protocol fees to 100%
    // functions checks internally that the position is expire-able
    function expirePosition(uint256 positionId) external;

    // Call this to "unwind" from a position that is already expired (expirePosition(..) above was already called with same position id )
    function claimExpiredPosition(uint256 positionId) external;

    // Force close logic is strategy specific
    // Every expired position can be forced closed at any time
    // functions checks internally that the position is force close-able (like: the collateral rate is met)
    // This is a privileged method
    // we take the transaction fee out of the position
    // we need a "forceCloser" contract that calls all forceClosePosition functions in one tx
    function forceClosePosition(uint256 positionId) external;

    // **************************************************************** //
    //           Helper view methods                                    //
    // **************************************************************** //

    // returns collateral + profits  - fee - slippage - etc amount expcted
    function previewUnwindPosition(uint256 positionId) external view returns (uint256 windfall);

    function viewPositionDetails(uint256 positionId)
        external
        view
        returns (
            uint256 collateral, // how much the user deposited in base asset
            uint256 leverageTaken, // lvUSD debt amount
            uint256 profit, // base asset amount of profits
            uint256 expirationDate,
            uint8 strategyIndex
        );

    function getStrategyIndex() external view;

    function getStrategyName() external view returns (string memory);
}
