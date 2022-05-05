// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Exchanger {
    /* Privileged functions: Admin */

    /// @dev initialize Vault
    /// @param _tokenLvUSD lvUSD contract address
    /// @param _tokenCoordinator Coordinator contract address
    function init(address _tokenLvUSD, address _tokenCoordinator, address _tokenOUSD) external {
        IERC20(_tokenLvUSD).approve(_tokenCoordinator, type(uint256).max);
        IERC20(_tokenOUSD).approve(_tokenCoordinator, type(uint256).max);
    }

    /**
     * @dev Exchanges LvUSD for OUSD using multiple CRV3Metapools
     * returns amount of OUSD
     * - MUST emit an event
     * NOTE: There is no guarantee of a 1:1 exchange ratio
     */
    function xLvUSDforOUSD(uint256 amountLvUSD, address to) external view returns (uint256) {
        /// TODO: change mock implementation
        console.log("Exchanging %s lvUSD to OUSD, assigning funds to address %s", amountLvUSD, to);
        return amountLvUSD;
    }

    /**
     * @dev Exchanges OUSD for LvUSD using multiple CRV3Metapools
     * returns amount of LvUSD
     * - MUST emit an event
     * - MUST revert if we dont get back the minimum required OUSD
     * NOTE: There is no gaurnatee of a 1:1 exchange ratio
     */
    function xOUSDforLvUSD(
        uint256 amountOUSD,
        address to,
        uint256 minRequiredLvUSD
    ) external  view returns (uint256 lvUSDReturned, uint256 remainingOUSD) {
        console.log("Exchanging%s OUSD for min %slvUSD, assigning funds to address %s", amountOUSD, minRequiredLvUSD, to);
        // return minRequiredLvUSD;
        return  (minRequiredLvUSD, amountOUSD - minRequiredLvUSD);
    }
}
