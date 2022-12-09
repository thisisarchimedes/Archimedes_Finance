pragma solidity 0.8.13;

import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {LeverageEngine} from "../contracts/LeverageEngine.sol";

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {AccessController} from "./AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract Zapper is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ICurveFiCurve internal _poolOUSD3CRV;
    IERC20Upgradeable internal _ousd;
    IERC20Upgradeable internal _usdt;
    IERC20Upgradeable internal _crv3;

    LeverageEngine internal _levEngine;
    IERC20Upgradeable internal _archToken;

    int128 constant ousdTokenIndex = 0;

    /// Coin 0 in pool is OUSD
    /// Coint 1 is 3crv
    /// Underlying, using https://etherscan.io/address/0xB9fC157394Af804a3578134A6585C0dc9cc990d4#readContract
    /// On pool OUSD pool 0x87650D7bbfC3A9F10587d7778206671719d9910D
    //  [0] OUSD 0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86 - 18
    //  [1] DAI 0x6B175474E89094C44Da98b954EedeAC495271d0F - 18
    //  [2] USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 - 6
    //  [3] USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7 - 6
    function zapIn(
        uint256 crvAmount,
        uint256 minCollateralReturned,
        uint256 cycles,
        int128 tokenIndex
    ) external {
        // Whats needs to happen?
        // 1) figure out how much of stable goes to lvUSD and how much to pay as arch tokens
        // 2) exchange stable for OUSD
        // 3) exchange stable for arch
        ///4 approve both OUSD and Arch to levEngine ( no need as we approve unlimited to LevEngine)
        // 4) open position
        // 5) return NFT

        /// Exchange Token for Arch
        // TODO:Implement

        /// Exchange OUSD from
        uint256 collateral = _exchangeToOUSD(tokenIndex, crvAmount, minCollateralReturned);
        console.log("collateral %s", collateral / 1 ether);
        // Approve - no need as it happens in setDependencies
        uint256 tokenId = _levEngine.createLeveragedPositionFromZapper(collateral, cycles, 100 ether, address(this));

        // return tokenId;
        /// One way to do it:
        /// No change to lev Engine.
    }

    function _exchangeToOUSD(
        int128 fromTokenIndex,
        uint256 amount,
        uint256 minAmountToReceive
    ) internal returns (uint256 amountOUSDReceived) {
        _usdt.safeApprove(address(_poolOUSD3CRV), amount);
        uint256 amountReceived = _poolOUSD3CRV.exchange_underlying(fromTokenIndex, ousdTokenIndex, amount, minAmountToReceive);
        _usdt.safeApprove(address(_poolOUSD3CRV), 0);
        return amountReceived;
    }

    function previewZapIn(
        uint256 crvAmount,
        uint256 minCollateralReturned,
        int128 tokenIndex
    ) external view returns (uint256 nftId) {
        // get_dy_underlying(int128 i,int128 j,uint256 dx
        uint256 coins = _poolOUSD3CRV.get_dy_underlying(3, 0, crvAmount);
        console.log("giving %s 3crv for %s OUSD", crvAmount / 10**6, coins / 1 ether);
        return 1;
    }

    // solhint-disable-next-line
    function _authorizeUpgrade(address newImplementation) internal override {
        _requireAdmin();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(ADMIN_ROLE, _msgSender());
        setGovernor(_msgSender());
        setExecutive(_msgSender());
        setGuardian(_msgSender());
    }

    function setDependencies(
        address addressOUSD,
        address address3CRV,
        address addressUSDT,
        address addressPoolOUSD3CRV,
        address addressLevEngine,
        address addressArchToken
    ) external nonReentrant onlyAdmin {
        require(addressOUSD != address(0), "cant set to 0 A");
        require(address3CRV != address(0), "cant set to 0 A");
        require(addressPoolOUSD3CRV != address(0), "cant set to 0 A");

        // Load contracts
        _ousd = IERC20Upgradeable(addressOUSD);
        _usdt = IERC20Upgradeable(addressUSDT);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolOUSD3CRV = ICurveFiCurve(addressPoolOUSD3CRV);
        _levEngine = LeverageEngine(addressLevEngine);
        _archToken = IERC20Upgradeable(addressArchToken);

        /// Need to approve for both Arch and ousd
        _ousd.safeApprove(addressLevEngine, 0);
        _ousd.safeApprove(addressLevEngine, type(uint256).max);

        /// Need to approve for both Arch and ousd
        _archToken.safeApprove(addressLevEngine, 0);
        _archToken.safeApprove(addressLevEngine, type(uint256).max);
    }
}
