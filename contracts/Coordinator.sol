// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ICoordinator} from "../contracts/interfaces/ICoordinator.sol";
import {IERC4626} from "../contracts/interfaces/IERC4626.sol";
import {VaultOUSD} from "../contracts/VaultOUSD.sol";
import {CDPosition} from "../contracts/CDPosition.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Exchanger} from "../contracts/Exchanger.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

/// @title Coordinator
/// @dev is in charge of overall flow of creating positions and unwinding positions
/// It manages keeping tracks of fund in vault, updating CDP as needed and transferring lvUSD inside the system
/// It is controlled (and called) by the leverage engine
contract Coordinator is ICoordinator, ReentrancyGuard {
    using SafeERC20 for IERC20;
    address internal _addressLvUSD;
    address internal _addressVaultOUSD;
    address internal _addressCDP;
    address internal _addressOUSD;
    address internal _addressExchanger;

    VaultOUSD internal _vault;
    CDPosition internal _cdp;
    Exchanger internal _exchanger;
    IERC20 internal _lvUSD;
    IERC20 internal _ousd;
    ParameterStore internal _paramStore;

    constructor() {}

    function init(
        address addressLvUSD,
        address addressVaultOUSD,
        address addressCDP,
        address addressOUSD,
        address addressExchanger,
        address addressParamStore
    ) external nonReentrant {
        _addressLvUSD = addressLvUSD;
        _addressVaultOUSD = addressVaultOUSD;
        _addressCDP = addressCDP;
        _addressOUSD = addressOUSD;
        _addressExchanger = addressExchanger;

        _vault = VaultOUSD(_addressVaultOUSD);
        _cdp = CDPosition(_addressCDP);
        _exchanger = Exchanger(_addressExchanger);
        _lvUSD = IERC20(_addressLvUSD);
        _ousd = IERC20(_addressOUSD);
        _paramStore = ParameterStore(addressParamStore);

        // approve VaultOUSD address to spend on behalf of coordinator
        _ousd.safeApprove(_addressVaultOUSD, type(uint256).max);
    }

    /* Privileged functions: Executive */

    function depositCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amountInOUSD,
        address _sharesOwner
    ) external override {
        /// Transfer collateral to vault, mint shares to shares owner
        uint256 shares = _vault.deposit(_amountInOUSD, _sharesOwner);
        // create CDP position with collateral
        _cdp.createPosition(_nftId, _amountInOUSD);
        _cdp.addSharesToPosition(_nftId, shares);
    }

    function withdrawCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amount,
        address _to,
        address _from
    ) external override nonReentrant {
        _withdrawCollateralUnderNFT(_nftId, _amount, _to, _from);
    }

    function _withdrawCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amount,
        address _to,
        address _from
    ) internal {
        _ousd.safeTransferFrom(_from, _to, _amount);
        _cdp.withdrawOUSDFromPosition(_nftId, _amount);
    }

    function borrowUnderNFT(uint256 _nftId, uint256 _amount) external override {
        _borrowUnderNFT(_nftId, _amount);
    }

    function _borrowUnderNFT(uint256 _nftId, uint256 _amount) internal {
        _lvUSD.transfer(_addressExchanger, _amount);
        _cdp.borrowLvUSDFromPosition(_nftId, _amount);
    }

    function repayUnderNFT(uint256 _nftId, uint256 _amountLvUSDToRepay) external override {
        _repayUnderNFT(_nftId, _amountLvUSDToRepay);
    }

    function _repayUnderNFT(uint256 _nftId, uint256 _amountLvUSDToRepay) internal {
        require(_cdp.getLvUSDBorrowed(_nftId) >= _amountLvUSDToRepay, "Coordinator : Cannot repay more lvUSD then is borrowed");
        _lvUSD.transferFrom(_addressExchanger, address(this), _amountLvUSDToRepay);
        _cdp.repayLvUSDToPosition(_nftId, _amountLvUSDToRepay);
    }

    function getLeveragedOUSD(
        uint256 _nftId,
        uint256 _amountToLeverage,
        address _sharesOwner
    ) external override nonReentrant {
        /* Flow
          1. basic sanity checks 
          2. borrow lvUSD
          3. call exchanger to exchange lvUSD. Exchanged OUSD will be under Coordinator address.  Save exchanged OUSD value 
          4. deposit OUSD funds in Vault
          5. Update CDP totalOUSD and shares for nft position
          /// TOOD : take origination fees from the exchanged OUSD (after exchange)
        */

        uint256 ousdPrinciple = _cdp.getOUSDPrinciple(_nftId);
        require(
            _amountToLeverage <= getAllowedLeverageForPosition(ousdPrinciple, _paramStore.getMaxNumberOfCycles()),
            "Cannot get more leverage then max allowed leverage"
        );

        // borrowUnderNFT transfer lvUSD from Coordinator to Exchanger + mark borrowed lvUSD in CDP under nft ID
        _borrowUnderNFT(_nftId, _amountToLeverage);

        /// TODO - call exchanger to exchange fund. For now, assume we got a one to one exchange rate
        uint256 ousdAmountExchanged = _exchanger.xLvUSDforOUSD(_amountToLeverage, address(this));

        uint256 sharesFromDeposit = _vault.deposit(ousdAmountExchanged, _sharesOwner);

        _cdp.addSharesToPosition(_nftId, sharesFromDeposit);
        _cdp.depositOUSDtoPosition(_nftId, ousdAmountExchanged);
    }

    function unwindLeveragedOUSD(
        uint256 _nftId,
        address _userAddress,
        address _sharesOwner
    ) external override nonReentrant {
        /* Flow
            1. sanity checks as needed
            2. get amount of shares for position
            3. redeem shares for OUSD (from vault), OUSD is assigned to exchanger 
            4. exchange as much OUSD as needed to cover lvUSD debt (do we want to exchange principle as well?) 
                    // slippage of 0.2% is ok, if dont - revert! 
            5. repay lvUSD
            6. return what OUSD is left to _userAddress
            7. delete CDP position 
        */

        uint256 numberOfSharesInPosition = _cdp.getShares(_nftId);
        uint256 borrowedLvUSD = _cdp.getLvUSDBorrowed(_nftId);

        require(numberOfSharesInPosition > 0, "Cannot unwind a position with no shares");

        uint256 redeemedOUSD = _vault.redeem(numberOfSharesInPosition, _addressExchanger, _sharesOwner);

        /// TODO: add slippage protection
        (uint256 exchangedLvUSD, uint256 remainingOUSD) = _exchanger.xOUSDforLvUSD(redeemedOUSD, address(this), borrowedLvUSD);

        _repayUnderNFT(_nftId, exchangedLvUSD);

        _withdrawCollateralUnderNFT(_nftId, remainingOUSD, _userAddress, _addressExchanger);
        // _ousd.safeTransferFrom(_addressExchanger, _userAddress, remainingOUSD);

        /// Note : leverage engine still need to make sure the delete the NFT itself in positionToken
        _cdp.deletePosition(_nftId);
    }

    function depositCollateralUnderAddress(uint256 _amount) external override notImplementedYet {}

    function withdrawCollateralUnderAddress(uint256 _amount) external override notImplementedYet {}

    function borrowUnderAddress(uint256 _amount) external override notImplementedYet {}

    function repayUnderAddress(uint256 _amount) external override notImplementedYet {}

    /* Privileged functions: Anyone */

    function addressOfLvUSDToken() external view override returns (address) {
        return _addressLvUSD;
    }

    function addressOfVaultOUSDToken() external view override returns (address) {
        return _addressVaultOUSD;
    }

    modifier notImplementedYet() {
        revert("Method not implemented yet");
        _;
    }

    /// Method returns the allowed leverage for principle and number of cycles
    /// Return value does not include principle!
    /// must be public as we need to access it in contract
    function getAllowedLeverageForPosition(uint256 principle, uint256 numberOfCycles) public view returns (uint256) {
        require(numberOfCycles <= _paramStore.getMaxNumberOfCycles(), "Number of cycles must be lower then allowed max");
        uint256 leverageAmount = 0;
        uint256 cyclePrinciple = principle;
        for (uint256 i = 0; i < numberOfCycles; i++) {
            cyclePrinciple = (cyclePrinciple * _paramStore.getGlobalCollateralRate()) / 100;
            leverageAmount += cyclePrinciple;
        }
        return leverageAmount;
    }
}
