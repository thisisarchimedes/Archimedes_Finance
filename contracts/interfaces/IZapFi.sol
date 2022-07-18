// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* solhint-disable */
interface IZapFi {
    function add_liquidity(
        address _pool,
        uint256[4] calldata _deposit_amounts,
        uint256 _min_mint_amount,
        address _receiver
    ) external returns (uint256);

    function calc_token_amount(
        address _pool,
        uint256[4] calldata _amounts,
        bool _deposit
    ) external view returns (uint256);
}
