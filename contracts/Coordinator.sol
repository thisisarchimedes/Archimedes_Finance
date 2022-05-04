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
    address internal _tokenLvUSD;
    address internal _tokenVaultOUSD;
    address internal _tokenCDP;
    address internal _treasuryAddress;
    address internal _tokenOUSD;
    address internal _tokenExchanger;

    uint256 internal _originationFeeRate = 5 ether / 100;
    uint256 internal _globalCollateralRate = 90; // in percentage
    uint256 internal _maxNumberOfCycles = 10;

    constructor(
        address tokenLvUSD,
        address tokenVaultOUSD,
        address tokenCDP,
        address tokenOUSD,
        address tokenExchanger,
        address treasuryAddress
    ) {
        _tokenLvUSD = tokenLvUSD;
        _tokenVaultOUSD = tokenVaultOUSD;
        _tokenCDP = tokenCDP;
        _tokenOUSD = tokenOUSD;
        _tokenExchanger = tokenExchanger;
        _treasuryAddress = treasuryAddress;

        // approve VaultOUSD address to spend on behalf of coordinator
        IERC20(_tokenOUSD).approve(_tokenVaultOUSD, type(uint256).max);
    }

    /* Privileged functions: Governor */
    function changeOriginationFeeRate(uint256 newFeeRate) external override {
        _originationFeeRate = newFeeRate;
    }

    function changeTreasuryAddress(address newTreasuryAddress) external override {
        _treasuryAddress = newTreasuryAddress;
    }

    function changeGlobalCollateralRate(uint256 _newGlobalCollateralRate) external override {
        require(
            _newGlobalCollateralRate <= 100 && _newGlobalCollateralRate > 0,
            "_globalCollateralRate must be a number between 1 and 100"
        );
        _globalCollateralRate = _newGlobalCollateralRate;
    }

    function changeMaxNumberOfCycles(uint256 _newMaxNumberOfCycles) external override {
        _maxNumberOfCycles = _newMaxNumberOfCycles;
    }

    /* Privileged functions: Executive */

    function depositCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amountInOUSD,
        address _sharesOwner
    ) external override {
        /// Transfer collateral to vault, mint shares to shares owner
        uint256 shares = VaultOUSD(_tokenVaultOUSD).deposit(_amountInOUSD, _sharesOwner);
        // create CDP position with collateral
        CDPosition(_tokenCDP).createPosition(_nftId, _amountInOUSD);
        CDPosition(_tokenCDP).addSharesToPosition(_nftId, shares);
    }

    function withdrawCollateralUnderNFT(uint256 amount, uint256 nftId) external override notImplementedYet {}

    function borrowUnderNFT(uint256 _nftId, uint256 _amount) external override {
        _borrowUnderNFT(_nftId, _amount);
    }

    function _borrowUnderNFT(uint256 _nftId, uint256 _amount) internal {
        IERC20(_tokenLvUSD).transfer(_tokenExchanger, _amount);
        CDPosition(_tokenCDP).borrowLvUSDFromPosition(_nftId, _amount);
    }

    function repayUnderNFT(uint256 _nftId, uint256 _amountLvUSDToRepay) external override {
        require(
            CDPosition(_tokenCDP).getLvUSDBorrowed(_nftId) >= _amountLvUSDToRepay,
            "Coordinator : Cannot repay more lvUSD then is borrowed"
        );
        IERC20(_tokenLvUSD).transferFrom(_tokenExchanger, address(this), _amountLvUSDToRepay);
        CDPosition(_tokenCDP).repayLvUSDToPosition(_nftId, _amountLvUSDToRepay);
    }

    function getLeveragedOUSD(
        uint256 _nftId,
        uint256 _amountToLeverage,
        address _sharesOwner
    ) external override {
        /* Flow
          1. basic sanity checks 
          2. borrow lvUSD
          3. call exchanger to exchange lvUSD. Exchanged OUSD will be under Coordinator address.  Save exchanged OUSD value 
          4. deposit OUSD funds in Vault
          5. Update CDP totalOUSD and shares for nft position
        */

        uint256 ousdPrinciple = CDPosition(_tokenCDP).getOUSDPrinciple(_nftId);
        require(
            _amountToLeverage <= getAllowedLeverageForPosition(ousdPrinciple, _maxNumberOfCycles),
            "Cannot get more leverage then max allowed leverage"
        );

        _borrowUnderNFT(_nftId, _amountToLeverage);

        /// TODO - call exchanger to exchange fund. For now, assume we got a one to one exchange rate
        uint256 ousdAmountExchanged = _amountToLeverage;

        uint256 sharesFromDeposit = VaultOUSD(_tokenVaultOUSD).deposit(ousdAmountExchanged, _sharesOwner);

        CDPosition(_tokenCDP).addSharesToPosition(_nftId, sharesFromDeposit);
        CDPosition(_tokenCDP).depositOUSDtoPosition(_nftId, ousdAmountExchanged);
    }

    function depositCollateralUnderAddress(uint256 _amount) external override notImplementedYet {}

    function withdrawCollateralUnderAddress(uint256 _amount) external override notImplementedYet {}

    function borrowUnderAddress(uint256 _amount) external override notImplementedYet {}

    function repayUnderAddress(uint256 _amount) external override notImplementedYet {}

    /* Privileged functions: Anyone */

    function addressOfLvUSDToken() external view override returns (address) {
        return _tokenLvUSD;
    }

    function addressOfVaultOUSDToken() external view override returns (address) {
        return _tokenVaultOUSD;
    }

    function getOriginationFeeRate() external view override returns (uint256) {
        return _originationFeeRate;
    }

    function getTreasuryAddress() public view override returns (address) {
        return _treasuryAddress;
    }

    function getGlobalCollateralRate() external view returns (uint256) {
        return _globalCollateralRate;
    }

    function getMaxNumberOfCycles() external view returns (uint256) {
        return _maxNumberOfCycles;
    }

    modifier notImplementedYet() {
        revert("Method not implemented yet");
        _;
    }

    /// Method returns the allowed leverage for principle and number of cycles
    /// Return value does not include principle!
    /// must be public as we need to access it in contract
    function getAllowedLeverageForPosition(uint256 principle, uint256 numberOfCycles) public view returns (uint256) {
        require(numberOfCycles <= _maxNumberOfCycles, "Number of cycles must be lower then allowed max");
        uint256 leverageAmount = 0;
        uint256 cyclePrinciple = principle;
        for (uint256 i = 0; i < numberOfCycles; i++) {
            cyclePrinciple = (cyclePrinciple * _globalCollateralRate) / 100;
            leverageAmount += cyclePrinciple;
        }
        return leverageAmount;
    }
}
