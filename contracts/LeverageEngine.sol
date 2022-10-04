// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {AccessController} from "./AccessController.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {PositionToken} from "./PositionToken.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {ArchToken} from "./ArchToken.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract LeverageEngine is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

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
    IERC20Upgradeable internal _ousd;

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
        _ousd = IERC20Upgradeable(_addressOUSD);
    }

    /* Non-privileged functions */

    /// @dev deposit OUSD under NFT ID
    ///
    /// User sends OUSD to the contract.
    /// We mint NFT, assign to msg.sender and do the leverage cycles
    ///
    /// @param ousdPrinciple the amount of OUSD sent to Archimedes
    /// @param cycles How many leverage cycles to do
    /// @param maxArchAmount max amount of Arch tokens to burn for position
    function createLeveragedPosition(
        uint256 ousdPrinciple,
        uint256 cycles,
        uint256 maxArchAmount
    ) external nonReentrant returns (uint256) {
        // add some minor buffer to the arch we will use for the position
        uint256 maxArchAmountBUfferedDown = maxArchAmount - 100;
        uint256 lvUSDAmount = _parameterStore.getAllowedLeverageForPositionWithArch(ousdPrinciple, cycles, maxArchAmountBUfferedDown);
        // Take only whole lvUSD, no weis
        // uint256 lvUSDAmountAllocatedFromArch = _parameterStore.calculateLeverageAllowedForArch(archAmount);
        uint256 archNeededToBurn = _parameterStore.calculateArchNeededForLeverage(lvUSDAmount) - 100; // minus 100 wei
        //console.log("lvUSDAmount %s, ousdPrinciple %s ", lvUSDAmount, ousdPrinciple);
        //console.log("%s<%s Not enough Arch given for Position", archNeededToBurn, maxArchAmountBUfferedDown);
        require(archNeededToBurn <= maxArchAmountBUfferedDown, "Not enough Arch given for Pos");
        // lvUSDAmountAllocatedFromArch = lvUSDAmountAllocatedFromArch + 10000000; /// add some safety margin
        /// Revert if not enough Arch token for needed leverage. Continue if too much arch is given
        // console.log("When creation position - lvUSDAmountAllocatedFromArch %s", lvUSDAmountAllocatedFromArch);
        // console.log("When creation position - lvUSDAmount %s", lvUSDAmount);

        // require(lvUSDAmountAllocatedFromArch >= lvUSDAmount, "Not enough Arch provided");
        uint256 availableLev = _coordinator.getAvailableLeverage();
        require(availableLev >= lvUSDAmount, "Not enough available lvUSD");
        _burnArchTokenForPosition(msg.sender, archNeededToBurn);
        uint256 positionTokenId = _positionToken.safeMint(msg.sender);
        _ousd.safeTransferFrom(msg.sender, _addressCoordinator, ousdPrinciple);
        _coordinator.depositCollateralUnderNFT(positionTokenId, ousdPrinciple);
        _coordinator.getLeveragedOUSD(positionTokenId, lvUSDAmount);

        emit PositionCreated(msg.sender, positionTokenId, ousdPrinciple, lvUSDAmount, archNeededToBurn);

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

    fallback() external {
        revert("LevEngine : Invalid access");
    }
}
