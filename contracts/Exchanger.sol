// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/interfaces/curvefi/ICurveFactory.sol";
import "../contracts/interfaces/curvefi/IRegistry.sol";
import "../contracts/interfaces/curvefi/IStableSwapPool.sol";
import {IExchanger} from "../contracts/interfaces/IExchanger.sol";

contract Exchanger is IExchanger {
    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * - MUST emit an event
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xLvUSDforOUSD(uint256 amountLvUSD) external override returns (uint256) {
        return 0;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xOUSDforLvUSD(uint256 amountOUSD, uint256 minRequired) external override returns (uint256) {
        return 0;
    }
}
