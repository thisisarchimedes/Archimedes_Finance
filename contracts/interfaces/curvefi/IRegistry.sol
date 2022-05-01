// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRegistry {
    /* solhint-disable */
    function get_lp_token(address pool) external returns (address);
}
