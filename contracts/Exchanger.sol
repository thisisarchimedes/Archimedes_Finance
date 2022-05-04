// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Exchanger {
    /* Privileged functions: Admin */

    /// @dev initialize Vault
    /// @param _tokenLvUSD lvUSD contract address
    /// @param _tokenCoordinator Coordinator contract address
    function init(address _tokenLvUSD, address _tokenCoordinator) external {
        IERC20(_tokenLvUSD).approve(_tokenCoordinator, type(uint256).max);
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
}
