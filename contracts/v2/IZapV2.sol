// We accept USDC USDT DAI
// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IZapV2 {
    // ZappIn with 3CRV/OUSD and through uniswap arch/eth( uniwswap support multi path transfers)
    // Assume user has approved crvAmount to ArchZap to spend
    function zapIn(
        uint256 crvAmount,
        uint256 minCollateralReturned,
        uint8 tokenIndex
    ) external returns (uint256 nftId);

    function zapInPreview(uint256 crvAmount, uint8 tokenIndex) external view returns (uint256 collateralAmount, uint256 archAmount);

    /// We want to have a variable fee on zap action. In ParamStore:
    function getZappFeeRate() external view returns (uint256 feeRate);

    function setZappFeeRate(uint256 newFeeRate) external;


    /// Need to add method to create position(through positionManager) via zapper
}
