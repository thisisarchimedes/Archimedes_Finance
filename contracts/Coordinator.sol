// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import {ICoordinator} from "../contracts/interfaces/ICoordinator.sol";

contract Coordinator is ICoordinator {
    address internal tokenLvUSD;
    address internal tokenVaultOUSD;

    constructor(
        address memory _tokenLvUSD, 
        address memory _tokenVaultOUSD) {
            tokenLvUSD = _tokenLvUSD;
            tokenVaultOUSD = _tokenVaultOUSD
        }
    
    function addressOfLvUSDToken() external view override returns (address){
        return tokenLVUSD
    }

    function addressOfVaultOUSDToken() external view override returns (address){
        return tokenVaultOUSD
    }
}
