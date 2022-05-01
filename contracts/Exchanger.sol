// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../contracts/interfaces/curvefi/ICurveFactory.sol";
import "../contracts/interfaces/curvefi/IRegistry.sol";
import "../contracts/interfaces/curvefi/IStableSwapPool.sol";
import {IExchanger} from "../contracts/interfaces/IExchanger.sol";

contract Exchanger is IExchanger {
    /* solhint-disable */
    using SafeMath for uint256;

    // ----------------- TOKEN CONVERSIONS -----------------
    /* 3Crv Pool */
    IStableSwapPool public constant pool3CrvOUSD = IStableSwapPool(0x87650D7bbfC3A9F10587d7778206671719d9910D);
    /* NOTE: Since LvUSD doesn't exist yet, we use the FRAX+Crv3 pool.
     * NOTE: To be replaced in the future with LvUSD. */
    IStableSwapPool public constant pool3CrvLvUSD = IStableSwapPool(0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B);

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * - MUST emit an event
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xLvUSDforOUSD(uint256 amount) external override returns (uint256) {
        uint256 min;
        /**
         * We can add a check here to make sure the expected exhcange rate is closer to 1:1 in the future
         * @dev: get_dy(indexSend, indexReceive, Amount)
         * 0 = LvUSD, 1 = 3Crv
         */
        uint256 expected3Crv = pool3CrvLvUSD.get_dy(0, 1, amount);

        /** Do the exchange
         * NOTE: Reverts if we get 5% less than expected
         */

        min = expected3Crv.mul(95).div(100);
        uint256 recieved3Crv = pool3CrvLvUSD.exchange(0, 1, amount, min);

        /** 0 = OUSD, 1 = 3Crv
         * We can add a check here to make sure the expected exhcange rate is closer to 1:1 in the future
         * @dev: (indexSend, indexReceive, Amount)
         */
        uint256 expectedOUSD = pool3CrvOUSD.get_dy(0, 1, recieved3Crv);

        /** Do the exchange
         * NOTE: Reverts if we get 5% less than expected
         */

        min = expectedOUSD.mul(95).div(100);
        uint256 recievedOUSD = pool3CrvOUSD.exchange(0, 1, recieved3Crv, min);
        return recievedOUSD;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xOUSDforLvUSD(uint256 amount, uint256 minRequired) external override returns (uint256) {
        return 0;
    }
}
