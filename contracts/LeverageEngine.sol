// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PositionToken} from "./PositionToken.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {LeverageAllocator} from "./LeverageAllocator.sol";

// Notes
// - nonReentrant: a method cant call itself (nested calls). Furthermore,
//   any method that has nonReentrant modifier cannot call another method with nonReentrant.
// - onlyOwner: only ownwer can call
//   https://github.com/NAOS-Finance/NAOS-Formation/blob/master/contracts/FormationV2.sol
contract LeverageEngine is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bool internal _initialized = false;
    uint256 internal _positionId;

    address internal _addressCoordinator;
    address internal _addressPositionToken;
    address internal _addressParameterStore;
    address internal _addressLeverageAllocator;
    address internal _addressOUSD;

    ICoordinator internal _coordinator;
    PositionToken internal _positionToken;
    ParameterStore internal _parameterStore;
    LeverageAllocator internal _leverageAllocator;
    IERC20 internal _ousd;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "onlyAdmin: Not admin");
        _;
    }

    modifier expectInitialized() {
        require(_initialized, "Not initialized");
        _;
    }

    /// @dev set the admin address to contract deployer
    constructor(address admin) {
        _setupRole(ADMIN_ROLE, admin);
    }

    /// @dev set the addresses for Coordinator, PositionToken, ParameterStore
    function init(
        address addressCoordinator,
        address addressPositionToken,
        address addressParameterStore,
        address addressLeverageAllocator,
        address addressOUSD
    ) external nonReentrant onlyAdmin {
        _addressCoordinator = addressCoordinator;
        _coordinator = ICoordinator(addressCoordinator);
        _addressPositionToken = addressPositionToken;
        _positionToken = PositionToken(addressPositionToken);
        _addressParameterStore = addressParameterStore;
        _parameterStore = ParameterStore(_addressParameterStore);
        _addressLeverageAllocator = addressLeverageAllocator;
        _leverageAllocator = LeverageAllocator(_addressLeverageAllocator);
        _addressOUSD = addressOUSD;
        _ousd = IERC20(_addressOUSD);
        _initialized = true;
    }

    /* Non-privileged functions */

    /// @dev deposit OUSD under NFT ID
    ///
    /// User sends OUSD to the contract.
    /// We mint NFT, assign to msg.sender and do the leverage cycles
    ///
    /// @param ousdPrinciple the amount of OUSD sent to Archimedes
    /// @param cycles How many leverage cycles to do
    function createLeveragedPosition(uint256 ousdPrinciple, uint256 cycles) external expectInitialized nonReentrant returns (uint256) {
        uint256 lvUSDAmount = _parameterStore.getAllowedLeverageForPosition(ousdPrinciple, cycles);
        console.log("CLP: lvUSDAmount is %s and ousdPrinciple is %s ", lvUSDAmount / 1 ether, ousdPrinciple / 1 ether);
        _leverageAllocator.useAvailableLvUSD(msg.sender, lvUSDAmount);
        uint256 positionTokenId = _positionToken.safeMint(msg.sender);
        console.log("CLP: positionTokenId %s", positionTokenId);
        console.log("CLP: msg.sender is %s, coordinator is %s", msg.sender, _addressCoordinator);
        _ousd.safeTransferFrom(msg.sender, _addressCoordinator, ousdPrinciple);
        console.log("CLP: after transfer of %s principle OUSD to coordinator", ousdPrinciple/ 1 ether);
        _coordinator.depositCollateralUnderNFT(positionTokenId, ousdPrinciple);
        console.log("CLP: after depositCollateralUnderNFT");
        _coordinator.getLeveragedOUSD(positionTokenId, lvUSDAmount);
        console.log("CLP: after getLeveragedOUSD");

        return positionTokenId;
    }

    /// @dev deposit OUSD under NFT ID
    ///
    /// De-leverage and unwind. Send OUSD to msg.sender
    /// must check that the msg.sender owns the NFT
    /// provide msg.sender address to coordinator destroy position
    ///
    /// @param positionTokenId the NFT ID of the position
    function unwindLeveragedPosition(uint256 positionTokenId) external expectInitialized nonReentrant {
        require(_positionToken.ownerOf(positionTokenId) == msg.sender, "Caller is not token owner");
        _positionToken.burn(positionTokenId);
        _coordinator.unwindLeveragedOUSD(positionTokenId, msg.sender);
    }
}
