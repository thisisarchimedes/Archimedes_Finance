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
    // TODO: when changing globalCollateralRate, check thats its between 0-100
    uint internal globalCollateralRate = 90; // in percentage
    uint internal maxNumberOfCycles = 10;

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

    function changeGlobalCollateralRate(uint newGlobalCollateralRate) external {
        require(newGlobalCollateralRate <= 100 && newGlobalCollateralRate > 0, "globalCollateralRate must be a number between 1 and 100");
        globalCollateralRate = newGlobalCollateralRate;
    }

    function changeMaxNumberOfCycles(uint newMaxNumberOfCycles) external {
        maxNumberOfCycles = newMaxNumberOfCycles;
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

    function getTreasuryAddress() external override view returns (address) {
        return treasuryAddress;
    }

    function getGlobalCollateralRate() external view returns (uint) {
        return globalCollateralRate;
    }

    function getMaxNumberOfCycles() external view returns(uint) {
        return maxNumberOfCycles;
    }

    modifier notImplementedYet() {
        revert("Method not implemented yet");
        _;
    }

    /// Method returns the allowed leverage for principle and number of cycles 
    /// Return value does not include principle! 
    /// must be public as we need to access it in contract
    function getAllowedLeverageForPosition(uint256 principle, uint numberOfCycles) public view returns(uint256) {
        require(numberOfCycles <= maxNumberOfCycles, "Number of cycles must be lower then allowed max");
        uint256 leverageAmount = 0;
        uint256 cyclePrinciple = principle;
        for (uint i =0; i < numberOfCycles; i++) {
            cyclePrinciple = cyclePrinciple * globalCollateralRate/100;
            leverageAmount += cyclePrinciple;
        }
        return leverageAmount;
    }
}
