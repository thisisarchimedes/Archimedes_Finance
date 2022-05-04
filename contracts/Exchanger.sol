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
    address internal _tokenCoordinator;
    IStableSwapPool internal _pool3CrvLvUSD;
    IStableSwapPool internal constant _pool3CrvOUSD = IStableSwapPool(0x87650D7bbfC3A9F10587d7778206671719d9910D);

    /* Privileged functions: Admin */

    /// @dev initialize Vault
    /// @param tokenLvUSD lvUSD contract address
    /// @param tokenCoordinator Coordinator contract address
    function initialize(
        address tokenLvUSD,
        address tokenCoordinator,
        address pool3CrvLvUSD
    ) external {
        _tokenLvUSD = tokenLvUSD;
        _tokenCoordinator = tokenCoordinator;
        _pool3CrvLvUSD = IStableSwapPool(pool3CrvLvUSD);
        IERC20(_tokenLvUSD).approve(_tokenCoordinator, type(uint256).max);
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * - MUST emit an event
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xLvUSDforOUSD(
        uint256 amount,
        address to,
        uint256 minRequired
    ) external override returns (uint256) {
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
        console.log(_pool3CrvLvUSD.coins(0)); // fei ???
        console.log(_pool3CrvLvUSD.coins(1)); // 3crv
        console.log(_pool3CrvLvUSD.coins(2));
        uint256 recieved3Crv = _pool3CrvLvUSD.exchange(1, 0, amount, min);
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
