// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0 ;

/* solhint-disable */
interface IZapFi {
    function add_liquidity(
        address 
        uint256[2] calldata _amounts,
        uint256 _min_mint_amount,
        address _receiver
    ) external returns (uint256);
}
