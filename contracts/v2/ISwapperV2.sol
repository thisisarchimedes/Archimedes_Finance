// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;



// SwapCurve
// SwapUniswap
// SwapBest (Curve, Uniswap, BProtocol)
interface ISwapperV2 {
    function swap(
        uint256 tokenInAmount,
        address tokenOutddress,
        address tokenInAddress,
        uint256 destAdrress,
        uint256 slippage
    ) external returns (uint256 tokenOutAmount);
    
    /// Use this method to spend minimum amount of In token to get (exactly) amount of out token requested
    /// For example, if we have 100 tokenInAmountAvaliable, we want exactly 20 tokenOutAmountNeeded and price if 1:1, expect to spend 20 In token to get 20 outToken only, leaving caller with 80 inToken
    /// In example above, tokenInSpend will be 20. 
    function swapWithMinimumInTokenAmount(
        uint256 tokenInAmountAvaliable,
        uint256 tokenOutAmountNeeded,
        address tokenOutddress,
        address tokenToAddress,
        uint256 destAdrress,
        uint256 slippage
    ) external returns (uint256 tokenInSpent);

    function previewSwap(
        uint256 tokenInAmount,
        address tokenOutddress,
        address tokenToAddress
    ) external view returns (uint256 tokenOutAmount);

     function previewswapWithMinimumInTokenAmount(
        uint256 tokenInAmountAvaliable,
        uint256 tokenOutAmountNeeded,
        address tokenOutddress,
        address tokenToAddress,
    ) external returns (uint256 tokenInSpent);

}
