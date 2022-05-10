// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {PositionToken} from "./PositionToken.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {LeverageAllocator} from "./LeverageAllocator.sol";

// Notes
// - nonReentrant: a method cant call itself (nested calls). Furthermore,
//   any method that has nonReentrant modifier cannot call another method with nonReentrant.
// - onlyOwner: only ownwer can call
//   https://github.com/NAOS-Finance/NAOS-Formation/blob/master/contracts/FormationV2.sol
contract LeverageEngine is ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bool internal _initialized = false;

    address internal _addressCoordinator;
    address internal _addressPositionToken;
    address internal _addressParameterStore;
    address internal _addressLeverageAllocator;

    ICoordinator internal _coordinator;
    PositionToken internal _positionToken;
    ParameterStore internal _parameterStore;
    LeverageAllocator internal _leverageAllocator;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "onlyAdmin: Caller is not admin");
        _;
    }

    modifier expectInitialized() {
        require(_initialized, "expectInitialized: contract is not initialized");
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
        address addressLeverageAllocator
    ) external nonReentrant onlyAdmin {
        _addressCoordinator = addressCoordinator;
        _coordinator = ICoordinator(addressCoordinator);
        _addressPositionToken = addressPositionToken;
        _positionToken = PositionToken(addressPositionToken);
        _addressParameterStore = addressParameterStore;
        _parameterStore = ParameterStore(_addressParameterStore);
        _addressLeverageAllocator = addressLeverageAllocator;
        _leverageAllocator = LeverageAllocator(_addressLeverageAllocator);
        _initialized = true;
    }

    /* Non-privileged functions */

    /// @dev deposit OUSD under NFT ID
    ///
    /// User sends OUSD to the contract.
    /// We mint NFT, assign to msg.sender and do the leverage cycles
    ///
    /// @param principle the amount of OUSD sent to Archimedes
    /// @param cycles How many leverage cycles to do
    function createLeveragedPosition(uint256 principle, uint256 cycles) external expectInitialized nonReentrant {
        require(cycles <= _parameterStore.getMaxNumberOfCycles(), "Number of cycles must be lower then allowed max");
    }

    /// @dev deposit OUSD under NFT ID
    ///
    /// De-leverage and unwind. Send OUSD to msg.sender
    /// must check that the msg.sender owns the NFT
    /// provide msg.sender address to coordinator destroy position
    ///
    /// @param nftId the nft ID
    function destroyLeveragedPosition(uint256 nftId) external expectInitialized nonReentrant {
        require(_positionToken.ownerOf(nftId) == msg.sender, "Caller address does not own this position token");
    }
}
