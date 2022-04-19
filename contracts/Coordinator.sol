// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import {ICoordinator} from "../contracts/interfaces/ICoordinator.sol";

/// @title Coordinator
/// @dev is in charge of overall flow of creating positions and unwinding positions
/// It manages keeping tracks of fund in vault, updating CDP as needed and transferring lvUSD inside the system
/// It is controlled (and called) by the leverage engine
contract Coordinator is ICoordinator {
    address internal tokenLvUSD;
    address internal tokenVaultOUSD;
    address internal treasuryAddress;

    uint256 originationFeeRate = 5 ether/100;

    constructor(address _tokenLvUSD, address _tokenVaultOUSD, address _treasuryAddress) {
        tokenLvUSD = _tokenLvUSD;
        tokenVaultOUSD = _tokenVaultOUSD;
        treasuryAddress = _treasuryAddress;
    }

    /* Privileged functions: Governor */
    function changeOriginationFeeRate(uint256 newFeeRate)
        external
        override
    {
        originationFeeRate = newFeeRate;
    }

    function changeTreasuryAddress(address newTreasuryAddress)
        external
        override
    {
        treasuryAddress = newTreasuryAddress;
    }

    /* Privileged functions: Executive */

    function withdrawCollateralUnderNFT(uint256 amount, uint256 nftId)
        external
        override
        notImplementedYet
    {}

    function borrowUnderNFT(uint256 _amount, uint256 _nftId)
        external
        override
        notImplementedYet
    {}

    function repayUnderNFT(uint256 _amount, uint256 _nftId)
        external
        override
        notImplementedYet
    {}

    function depositCollateralUnderNFT(uint256 amount, uint256 nftId)
        external
        override
        notImplementedYet
    {}

    function depositCollateralUnderAddress(uint256 _amount)
        external
        override
        notImplementedYet
    {}

    function withdrawCollateralUnderAddress(uint256 _amount)
        external
        override
        notImplementedYet
    {}

    function borrowUnderAddress(uint256 _amount)
        external
        override
        notImplementedYet
    {}

    function repayUnderAddress(uint256 _amount)
        external
        override
        notImplementedYet
    {}

    /* Privileged functions: Anyone */

    function addressOfLvUSDToken() external view override returns (address) {
        return tokenLvUSD;
    }

    function addressOfVaultOUSDToken()
        external
        view
        override
        returns (address)
    {
        return tokenVaultOUSD;
    }

    function getOriginationFeeRate() external override view returns (uint256) {
        return originationFeeRate;
    }

     function getTreasuryAddress() public override view returns (address) {
        return treasuryAddress;
    }

    modifier notImplementedYet() {
        revert("Method not implemented yet");
        _;
    }
}
