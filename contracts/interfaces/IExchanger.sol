// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IExchanger {
    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * returns amount of OUSD
     * - MUST emit an event
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xLvUSDforOUSD(uint256 amountLvUSD) external returns (uint256);

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * returns amount of LvUSD
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xOUSDforLvUSD(uint256 amountOUSD, uint256 minRequired) external returns (uint256);
}
