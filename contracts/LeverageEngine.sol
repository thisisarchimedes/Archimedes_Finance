// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "hardhat/console.sol";

import {AccessController} from "./AccessController.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PositionToken} from "./PositionToken.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {LeverageAllocator} from "./LeverageAllocator.sol";

// Notes
// - nonReentrant: a method cant call itself (nested calls). Furthermore,
//   any method that has nonReentrant modifier cannot call another method with nonReentrant.
// - onlyOwner: only ownwer can call
//   https://github.com/NAOS-Finance/NAOS-Formation/blob/master/contracts/FormationV2.sol
contract LeverageEngine is AccessController {
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

    constructor(address admin) AccessController(admin) {}

    /// @dev set the addresses for Coordinator, PositionToken, ParameterStore
    function init(
        address addressCoordinator,
        address addressPositionToken,
        address addressParameterStore,
        address addressLeverageAllocator,
        address addressOUSD
    ) external nonReentrant initializer onlyAdmin {
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
        _leverageAllocator.useAvailableLvUSD(msg.sender, lvUSDAmount);
        uint256 positionTokenId = _positionToken.safeMint(msg.sender);
        _ousd.transferFrom(msg.sender, _addressCoordinator, ousdPrinciple);
        _coordinator.depositCollateralUnderNFT(positionTokenId, ousdPrinciple);
        _coordinator.getLeveragedOUSD(positionTokenId, lvUSDAmount);
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
