// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ICoordinator} from "../contracts/interfaces/ICoordinator.sol";
import {IERC4626} from "../contracts/interfaces/IERC4626.sol";
import {VaultOUSD} from "../contracts/VaultOUSD.sol";
import {CDPosition} from "../contracts/CDPosition.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";



/// @title Coordinator
/// @dev is in charge of overall flow of creating positions and unwinding positions
/// It manages keeping tracks of fund in vault, updating CDP as needed and transferring lvUSD inside the system
/// It is controlled (and called) by the leverage engine
contract Coordinator is ICoordinator {
    address internal tokenLvUSD;
    address internal tokenVaultOUSD;
    address internal tokenCDP;
    address internal treasuryAddress;
    address internal tokenOUSD;

    uint256 originationFeeRate = 5 ether/100;

    constructor(address _tokenLvUSD, address _tokenVaultOUSD, address _tokenCDP, address _tokenOUSD, address _treasuryAddress) {
        tokenLvUSD = _tokenLvUSD;
        tokenVaultOUSD = _tokenVaultOUSD;
        tokenCDP = _tokenCDP;
        treasuryAddress = _treasuryAddress;
        tokenOUSD = _tokenOUSD;

        // approve VaultOUSD address to spend on behalf of coordinator
        IERC20(tokenOUSD).approve(tokenVaultOUSD, type(uint256).max);

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

    function depositCollateralUnderNFT(uint256 nftId, uint256 amount, address sharesOwner)
        external
        override
    {   
        /// Transfer collateral to vault, mint shares to shares owner
        VaultOUSD(tokenVaultOUSD).deposit(amount, sharesOwner);
        // create CDP position with collateral
        CDPosition(tokenCDP).createPosition(nftId, amount);
    }

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
