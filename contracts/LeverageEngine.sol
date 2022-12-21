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
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract LeverageEngine is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

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

    event PositionCreated(
        address indexed _from,
        uint256 indexed _positionId,
        uint256 _princple,
        uint256 _levTaken,
        uint256 _archBurned,
        uint256 _positionExp
    );
    event PositionUnwind(address indexed _from, uint256 indexed _positionId, uint256 _positionWindfall);

    /// @dev set the addresses for Coordinator, PositionToken, ParameterStore
    function setDependencies(
        address addressCoordinator,
        address addressPositionToken,
        address addressParameterStore,
        address addressArchToken,
        address addressOUSD
    ) external nonReentrant onlyAdmin {
        require(addressCoordinator != address(0), "cant set to 0 A");
        require(addressPositionToken != address(0), "cant set to 0 A");
        require(addressParameterStore != address(0), "cant set to 0 A");
        require(addressArchToken != address(0), "cant set to 0 A");
        require(addressOUSD != address(0), "cant set to 0 A");
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
    ) external nonReentrant whenNotPaused returns (uint256) {
        return _createLeveragedPosition(ousdPrinciple, cycles, maxArchAmount, msg.sender);
    }

    function createLeveragedPositionFromZapper(
        uint256 ousdPrinciple,
        uint256 cycles,
        uint256 maxArchAmount,
        address userAddress
    ) external nonReentrant whenNotPaused returns (uint256) {
        _createLeveragedPosition(ousdPrinciple, cycles, maxArchAmount, userAddress);
    }

    /* Non-privileged functions */

    function _createLeveragedPosition(
        uint256 ousdPrinciple,
        uint256 cycles,
        uint256 maxArchAmount,
        address userAddress
    ) internal returns (uint256) {
        // console.log("in createLeveragedPositionFromZapper: msg.sender is %s", msg.sender);
        // add some minor buffer to the arch we will use for the position
        if (cycles == 0 || cycles > _parameterStore.getMaxNumberOfCycles()) {
            revert("Invalid number of cycles");
        }
        if (ousdPrinciple < _parameterStore.getMinPositionCollateral()) {
            revert("Collateral lower then min");
        }
        // this is how much lvUSD we can get with the given (max) arch
        uint256 lvUSDAmount = _parameterStore.getAllowedLeverageForPositionWithArch(ousdPrinciple, cycles, maxArchAmount);
        /// this is how much lvUSD we can get if we had "more then enough" Arch token to open a big position
        uint256 lvUSDAmountNeedForArguments = _parameterStore.getAllowedLeverageForPosition(ousdPrinciple, cycles);

        /// check that user gave enough arch allowance for cycle-principle combo
        require(lvUSDAmountNeedForArguments - 1 <= lvUSDAmount, "cant get enough lvUSD");
        uint256 archNeededToBurn = (_parameterStore.calculateArchNeededForLeverage(lvUSDAmount) / 10000) * 10000; // minus 1000 wei

        require(archNeededToBurn <= maxArchAmount, "Not enough Arch given for Pos");
        uint256 availableLev = _coordinator.getAvailableLeverage();
        require(availableLev >= lvUSDAmount, "Not enough available leverage");
        _burnArchTokenForPosition(msg.sender, archNeededToBurn);
        uint256 positionTokenId = _positionToken.safeMint(userAddress);

        // Checking allowance due to a potential bug in OUSD contract that can under some conditions, transfer much more then allowance.
        // This bug is fixed in later versions of solidity but adding the check here as a precaution
        if (_ousd.allowance(msg.sender, address(this)) >= ousdPrinciple) {
            _ousd.safeTransferFrom(msg.sender, _addressCoordinator, ousdPrinciple);
        } else {
            revert("insuff OUSD allowance");
        }

        _coordinator.depositCollateralUnderNFT(positionTokenId, ousdPrinciple);
        _coordinator.getLeveragedOUSD(positionTokenId, lvUSDAmount);
        uint256 positionExpireTime = _coordinator.getPositionExpireTime(positionTokenId);

        emit PositionCreated(userAddress, positionTokenId, ousdPrinciple, lvUSDAmount, archNeededToBurn, positionExpireTime);

        return positionTokenId;
    }

    /// @dev deposit OUSD under NFT ID
    ///
    /// De-leverage and unwind. Send OUSD to msg.sender
    /// must check that the msg.sender owns the NFT
    /// provide msg.sender address to coordinator destroy position
    ///
    /// @param positionTokenId the NFT ID of the position
    function unwindLeveragedPosition(uint256 positionTokenId) external nonReentrant whenNotPaused {
        require(_positionToken.ownerOf(positionTokenId) == msg.sender, "Caller is not token owner");
        _positionToken.burn(positionTokenId);
        uint256 positionWindfall = _coordinator.unwindLeveragedOUSD(positionTokenId, msg.sender);
        emit PositionUnwind(msg.sender, positionTokenId, positionWindfall);
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

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

    function pauseContract() external onlyGuardian {
        _pause();
    }

    function unPauseContract() external onlyGuardian {
        _unpause();
    }

    fallback() external {
        revert("LevEngine : Invalid access");
    }
}
