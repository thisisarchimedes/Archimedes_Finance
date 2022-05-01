// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStableSwapPool {
    /* solhint-disable */

    function add_liquidity(uint256 amounts, uint256 min_mint_amount) external returns (uint256);

    function remove_liquidity_imbalance(uint256 amounts, uint256 max_burn_amount) external returns (uint256);

    function remove_liquidity(uint256 amount, uint256 min_amounts) external returns (uint256);

    function remove_liquidity_one_coin(
        uint256 token_amount,
        int128 i,
        uint256 min_amount
    ) external returns (uint256);

    function coins(uint256 i) external returns (address);

    function balanceOf(address account) external returns (uint256);

    /**
     * Performs an exchange between two tokens.
     * Index values can be found using the coins public getter method, or get_coins within the factory contract.
     * @param i: Index value of the token to send.
     * @param j: Index value of the token to receive.
     * @param dx: The amount of i being exchanged.
     * @param min_dy: The minimum amount of j to receive. If the swap would result in less, the transaction will revert.
     * Returns the amount of j received in the exchange.
     */
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    /**
     * Get the amount received (“dy”) when swapping between two underlying assets within the pool.
     * Index values can be found using get_underlying_coins within the factory contract.
     * @param i: Index value of the token to send.
     * @param j: Index value of the token to receive.
     * @param dx: The amount of i being exchanged.
     * Returns the amount of j received.
     */
    function get_dy_underlying(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);

    /**
     * Get the amount received (“dy”) when performing a swap between two assets within the pool.
     * Index values can be found using the coins public getter method, or get_coins within the factory contract.
     * @param i: Index value of the coin to send.
     * @param j: Index value of the coin to receive.
     * @param dx: The amount of i being exchanged.
     * Returns the amount of j received.
     */
    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
}
