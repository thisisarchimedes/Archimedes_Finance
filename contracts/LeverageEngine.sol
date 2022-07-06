// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessController} from "./AccessController.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PositionToken} from "./PositionToken.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {ArchToken} from "./ArchToken.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Notes
// - nonReentrant: a method cant call itself (nested calls). Furthermore,
//   any method that has nonReentrant modifier cannot call another method with nonReentrant.
// - onlyOwner: only ownwer can call
//   https://github.com/NAOS-Finance/NAOS-Formation/blob/master/contracts/FormationV2.sol
contract LeverageEngine is AccessController, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    uint256 internal _positionId;
    address internal _addressCoordinator;
    address internal _addressPositionToken;
    address internal _addressParameterStore;
    address internal _addressArchToken;
    address internal _addressOUSD;

    ICoordinator internal _coordinator;
    PositionToken internal _positionToken;
    ParameterStore internal _parameterStore;
    ArchToken internal _archToken;
    IERC20 internal _ousd;

    event PositionCreated(address indexed _from, uint256 indexed _positionId, uint256 _princple, uint256 _levTaken, uint256 _archBurned);
    event PositionUnwind(address indexed _from, uint256 indexed _positionId, uint256 _positionWindfall);

    /// @dev set the addresses for Coordinator, PositionToken, ParameterStore
    function setDependencies(
        address addressCoordinator,
        address addressPositionToken,
        address addressParameterStore,
        address addressArchToken,
        address addressOUSD
    ) external nonReentrant onlyAdmin {
        _addressCoordinator = addressCoordinator;
        _coordinator = ICoordinator(addressCoordinator);
        _addressPositionToken = addressPositionToken;
        _positionToken = PositionToken(addressPositionToken);
        _addressParameterStore = addressParameterStore;
        _parameterStore = ParameterStore(addressParameterStore);
        _addressArchToken = addressArchToken;
        _archToken = ArchToken(addressArchToken);
        _addressOUSD = addressOUSD;
        _ousd = IERC20(_addressOUSD);
    }

    /* Non-privileged functions */

    /// @dev deposit OUSD under NFT ID
    ///
    /// User sends OUSD to the contract.
    /// We mint NFT, assign to msg.sender and do the leverage cycles
    ///
    /// @param ousdPrinciple the amount of OUSD sent to Archimedes
    /// @param cycles How many leverage cycles to do
    /// @param archAmount Arch tokens to burn for position
    function createLeveragedPosition(
        uint256 ousdPrinciple,
        uint256 cycles,
        uint256 archAmount
    ) external nonReentrant returns (uint256) {
        uint256 lvUSDAmount = _parameterStore.getAllowedLeverageForPosition(ousdPrinciple, cycles);
        uint256 lvUSDAmountAllocatedFromArch = _parameterStore.calculateLeverageAllowedForArch(archAmount);
        /// Revert if not enough Arch token for needed leverage. Continue if too much arch is given
        require(lvUSDAmountAllocatedFromArch >= lvUSDAmount, "Not enough Arch provided");

        uint256 availableLev = _coordinator.getAvailableLeverage();
        require(availableLev >= lvUSDAmount, "Not enough available lvUSD");

        _burnArchTokenForPosition(msg.sender, archAmount);
        uint256 positionTokenId = _positionToken.safeMint(msg.sender);
        _ousd.safeTransferFrom(msg.sender, _addressCoordinator, ousdPrinciple);
        _coordinator.depositCollateralUnderNFT(positionTokenId, ousdPrinciple);
        _coordinator.getLeveragedOUSD(positionTokenId, lvUSDAmount);

        emit PositionCreated(msg.sender, positionTokenId, ousdPrinciple, lvUSDAmount, archAmount);
        return positionTokenId;
    }

    /// @dev deposit OUSD under NFT ID
    ///
    /// De-leverage and unwind. Send OUSD to msg.sender
    /// must check that the msg.sender owns the NFT
    /// provide msg.sender address to coordinator destroy position
    ///
    /// @param positionTokenId the NFT ID of the position
    function unwindLeveragedPosition(uint256 positionTokenId) external nonReentrant {
        require(_positionToken.ownerOf(positionTokenId) == msg.sender, "Caller is not token owner");
        _positionToken.burn(positionTokenId);
        uint256 positionWindfall = _coordinator.unwindLeveragedOUSD(positionTokenId, msg.sender);
        emit PositionUnwind(msg.sender, positionTokenId, positionWindfall);
    }

    function initialize() public initializer {
        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    // required - the caller must have allowance for accounts's tokens of at least amount.
    function _burnArchTokenForPosition(address sender, uint256 archAmount) internal {
        address treasuryAddress = _parameterStore.getTreasuryAddress();
        _archToken.transferFrom(sender, treasuryAddress, archAmount);
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }
}
