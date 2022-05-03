// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Exchanger {
    /* Privileged functions: Admin */

    /// @dev initialize Vault
    /// @param _tokenLvUSD lvUSD contract address
    /// @param _tokenCoordinator Coordinator contract address
    function init(address _tokenLvUSD, address _tokenCoordinator) external {
        IERC20(_tokenLvUSD).approve(_tokenCoordinator, type(uint256).max);
    }
}
