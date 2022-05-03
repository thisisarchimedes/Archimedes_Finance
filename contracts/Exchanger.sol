// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../contracts/interfaces/curvefi/ICurveFactory.sol";
import "../contracts/interfaces/curvefi/IRegistry.sol";
import "../contracts/interfaces/curvefi/IStableSwapPool.sol";
import {IExchanger} from "../contracts/interfaces/IExchanger.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Exchanger is IExchanger {
    /* solhint-disable */
    using SafeMath for uint256;

    address internal _tokenLvUSD;

    /* Privileged functions: Admin */

    /// @dev initialize Vault
    /// @param _tokenLvUSD lvUSD contract address
    /// @param _tokenCoordinator Coordinator contract address
    function init(address _tokenLvUSD, address _tokenCoordinator) external {
        IERC20(_tokenLvUSD).approve(_tokenCoordinator, type(uint256).max);
    }

    // ----------------- TOKEN CONVERSIONS -----------------
    /* 3Crv Pool */
    IStableSwapPool internal constant _pool3CrvOUSD = IStableSwapPool(0x87650D7bbfC3A9F10587d7778206671719d9910D);
    /* NOTE: Since LvUSD doesn't exist yet, we use the FEI/Crv3 pool. */
    IStableSwapPool internal constant _pool3CrvLvUSD = IStableSwapPool(0x06cb22615BA53E60D67Bf6C341a0fD5E718E1655);

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * - MUST emit an event
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xLvUSDforOUSD(uint256 amount, address to) external override returns (uint256) {
        /// make sure we have enough to use
        uint256 min;

        /**
         * Exchange LvUSD for one of the 3 tokens in 3 pool
         * For now lets do USDC
         * We can add a check here to make sure the expected exhcange rate is closer to 1:1 in the future
         * @dev: get_dy(indexSend, indexReceive, Amount)
         * 0 = LvUSD, 1 = 3Crv
         */
        uint256 expected3Crv = _pool3CrvLvUSD.get_dy(0, 1, amount);
        console.log("expected 3rcv:", expected3Crv);

        /** Do the exchange
         * NOTE: Reverts if we get 5% less than expected
         */

        min = expected3Crv.mul(95).div(100);
        console.log("min (95%):", min);
        // indexToken in, indexToken out, amount, minimum
        uint256 recieved3Crv = _pool3CrvLvUSD.exchange(0, 1, amount, min);
        console.log("recieved 3rc", recieved3Crv);

        /** 0 = OUSD, 1 = 3Crv
         * We can add a check here to make sure the expected exhcange rate is closer to 1:1 in the future
         * @dev: (indexSend, indexReceive, Amount)
         */
        uint256 expectedOUSD = _pool3CrvOUSD.get_dy(0, 1, recieved3Crv);
        console.log("expected ousd", expectedOUSD);

        /** Do the exchange
         * NOTE: Reverts if we get 5% less than expected
         */

        min = expectedOUSD.mul(95).div(100);
        uint256 recievedOUSD = _pool3CrvOUSD.exchange(0, 1, recieved3Crv, min);
        console.log("recieved ousd", recieved3Crv);

        return recievedOUSD;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xOUSDforLvUSD(
        uint256 amount,
        address to,
        uint256 minRequired
    ) external override returns (uint256) {
        return 0;
    }
}
