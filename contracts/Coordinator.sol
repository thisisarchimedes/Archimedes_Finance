// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ICoordinator} from "../contracts/interfaces/ICoordinator.sol";
import {VaultOUSD} from "../contracts/VaultOUSD.sol";
import {CDPosition} from "../contracts/CDPosition.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
// import {IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20.sol";

import {Exchanger} from "../contracts/Exchanger.sol";
// import {SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {AccessController} from "./AccessController.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

/// @title Coordinator
/// @dev is in charge of overall flow of creating positions and unwinding positions
/// It manages keeping tracks of fund in vault, updating CDP as needed and transferring lvUSD inside the system
/// It is controlled (and called) by the leverage engine
contract Coordinator is ICoordinator, AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    address internal _addressLvUSD;
    address internal _addressVaultOUSD;
    address internal _addressCDP;
    address internal _addressOUSD;
    address internal _addressExchanger;

    VaultOUSD internal _vault;
    CDPosition internal _cdp;
    Exchanger internal _exchanger;
    IERC20Upgradeable internal _lvUSD;
    IERC20Upgradeable internal _ousd;
    ParameterStore internal _paramStore;

    modifier notImplementedYet() {
        revert("Method not implemented yet");
        _;
    }

    function setDependencies(
        address addressLvUSD,
        address addressVaultOUSD,
        address addressCDP,
        address addressOUSD,
        address addressExchanger,
        address addressParamStore
    ) external nonReentrant onlyAdmin {
        _addressLvUSD = addressLvUSD;
        _addressVaultOUSD = addressVaultOUSD;
        _addressCDP = addressCDP;
        _addressOUSD = addressOUSD;
        _addressExchanger = addressExchanger;

        _vault = VaultOUSD(_addressVaultOUSD);
        _cdp = CDPosition(_addressCDP);
        _exchanger = Exchanger(_addressExchanger);
        _lvUSD = IERC20Upgradeable(_addressLvUSD);
        _ousd = IERC20Upgradeable(_addressOUSD);
        _paramStore = ParameterStore(addressParamStore);

        // approve VaultOUSD address to spend OUSD on behalf of coordinator
        _ousd.safeApprove(_addressVaultOUSD, type(uint256).max);
    }

    /* Privileged functions: Executive */

    // Note: Expects funds to be under coordinator already
    function depositCollateralUnderNFT(uint256 _nftId, uint256 _amountInOUSD) external override nonReentrant onlyExecutive {
        /// Transfer collateral to vault, mint shares to shares owner
        uint256 shares = _vault.archimedesDeposit(_amountInOUSD, address(this));
        // create CDP position with collateral
        _cdp.createPosition(_nftId, _amountInOUSD);
        _cdp.addSharesToPosition(_nftId, shares);
    }

    function withdrawCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amount,
        address _to
    ) external override nonReentrant onlyExecutive {
        _withdrawCollateralUnderNFT(_nftId, _amount, _to);
    }

    function borrowUnderNFT(uint256 _nftId, uint256 _amount) external override nonReentrant onlyExecutive {
        _borrowUnderNFT(_nftId, _amount);
    }

    function repayUnderNFT(uint256 _nftId, uint256 _amountLvUSDToRepay) external override nonReentrant onlyExecutive {
        _repayUnderNFT(_nftId, _amountLvUSDToRepay);
    }

    function getLeveragedOUSD(uint256 _nftId, uint256 _amountToLeverage) external override nonReentrant onlyExecutive {
        /* Flow
          1. basic sanity checks 
          2. borrow lvUSD
          3. call exchanger to exchange lvUSD. Exchanged OUSD will be under Coordinator address.  Save exchanged OUSD value 
          4. deposit OUSD funds in Vault
          5. Update CDP totalOUSD and shares for nft position
        */

        uint256 ousdPrinciple = _cdp.getOUSDPrinciple(_nftId);
        require(
            _amountToLeverage <= _paramStore.getAllowedLeverageForPosition(ousdPrinciple, _paramStore.getMaxNumberOfCycles()),
            "Leverage more than max allowed"
        );

        // borrowUnderNFT transfer lvUSD from Coordinator to Exchanger + mark borrowed lvUSD in CDP under nft ID
        _borrowUnderNFT(_nftId, _amountToLeverage);

        uint256 ousdAmountExchanged = _exchanger.swapLvUSDforOUSD(_amountToLeverage);
        uint256 feeTaken = _takeOriginationFee(ousdAmountExchanged);
        uint256 positionLeveragedOUSDAfterFees = ousdAmountExchanged - feeTaken;
        uint256 sharesFromDeposit = _vault.archimedesDeposit(positionLeveragedOUSDAfterFees, address(this));

        _cdp.addSharesToPosition(_nftId, sharesFromDeposit);
        _cdp.depositOUSDtoPosition(_nftId, positionLeveragedOUSDAfterFees);
    }

    function unwindLeveragedOUSD(uint256 _nftId, address _userAddress)
        external
        override
        nonReentrant
        onlyExecutive
        returns (uint256 positionWindfall)
    {
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
        require(numberOfSharesInPosition > 0, "Position has no shares");

        uint256 redeemedOUSD = _vault.archimedesRedeem(numberOfSharesInPosition, _addressExchanger, address(this));

        /// TODO: add slippage protection
        (uint256 exchangedLvUSD, uint256 remainingOUSD) = _exchanger.swapOUSDforLvUSD(redeemedOUSD, borrowedLvUSD);

        _repayUnderNFT(_nftId, exchangedLvUSD);

        // transferring funds from coordinator to user
        _withdrawCollateralUnderNFT(_nftId, remainingOUSD, _userAddress);

        /// Note : leverage engine still need to make sure the delete the NFT itself in positionToken
        _cdp.deletePosition(_nftId);

        return remainingOUSD;
    }

    function buyLvUSD(address buyerAddress, uint256 amoutLvUSDToBuy) external nonReentrant onlyAdmin {
        /// Methos assumes that caller (which is admin), has allownce on buyerFunds
        require(getAvailableLeverage() > amoutLvUSDToBuy, "insufficent lvUSD in Coordinator");
        /// transfer OUSD to treasury 
    }

    /* Privileged functions: Anyone */

    function getAvailableLeverage() external view returns (uint256) {
        return _lvUSD.balanceOf(address(this));
    }

    function addressOfLvUSDToken() external view override returns (address) {
        return _addressLvUSD;
    }

    function addressOfVaultOUSDToken() external view override returns (address) {
        return _addressVaultOUSD;
    }

    function initialize() public initializer {
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    function _withdrawCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amount,
        address _to
    ) internal {
        /// Method makes sure ousd recorded balance transfer
        uint256 userOusdBalanceBeforeWithdraw = _ousd.balanceOf(_to);
        _ousd.safeTransfer(_to, _amount);
        require(_ousd.balanceOf(_to) == userOusdBalanceBeforeWithdraw + _amount, "OUSD transfer balance incorrect");
        _cdp.withdrawOUSDFromPosition(_nftId, _amount);
    }

    function _borrowUnderNFT(uint256 _nftId, uint256 _amount) internal {
        _lvUSD.transfer(_addressExchanger, _amount);
        _cdp.borrowLvUSDFromPosition(_nftId, _amount);
    }

    function _repayUnderNFT(uint256 _nftId, uint256 _amountLvUSDToRepay) internal {
        _cdp.repayLvUSDToPosition(_nftId, _amountLvUSDToRepay);
    }

    function _takeOriginationFee(uint256 _leveragedOUSDAmount) internal returns (uint256 fee) {
        uint256 _fee = _paramStore.calculateOriginationFee(_leveragedOUSDAmount);
        _ousd.safeTransfer(_paramStore.getTreasuryAddress(), _fee);
        return _fee;
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }
}
