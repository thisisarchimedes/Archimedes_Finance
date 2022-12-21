// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {LeverageEngine} from "../contracts/LeverageEngine.sol";
import {IUniswapV2Router02} from "../contracts/interfaces/IUniswapV2Router02.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {AccessController} from "./AccessController.sol";
import {ParameterStore} from "./ParameterStore.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract Zapper is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ICurveFiCurve internal _poolOUSD3CRV;
    IUniswapV2Router02 internal _uniswapRouter;
    IERC20Upgradeable internal _ousd;
    IERC20Upgradeable internal _usdt;
    IERC20Upgradeable internal _crv3;
    LeverageEngine internal _levEngine;
    IERC20Upgradeable internal _archToken;
    ParameterStore internal _paramStore;

    address constant _addressUSDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant _addressWETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant _addressUniswapFactory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    int128 constant ousdTokenIndex = 0;

    function _getPath(address addressBaseStable) internal view returns (address[] memory) {
        address[] memory path = new address[](3);
        path[0] = addressBaseStable;
        path[1] = _addressWETH9;
        path[2] = address(_archToken);
        return path;
    }

    function _getTokenIndex(address addressBaseStable) internal pure returns (int128 tokenIndex) {
        if (addressBaseStable == _addressUSDT) {
            return tokenIndex = 3;
        }
        revert("Zapper: Unsupported stablecoin");
    }

    function _getTokenDecimal(address addressBaseStable) internal pure returns (uint8) {
        if (addressBaseStable == _addressUSDT) {
            return 6;
        }
        revert("Zapper: Unsupported stablecoin");
    }

    function _calcCollateralBasedOnArchPrice(
        uint256 stableCoinAmount,
        uint256 archPriceInUSDT,
        uint256 multiplierOfLeverageFromOneCollateral,
        uint8 decimal
    ) internal view returns (uint256 collateralAmountReturned) {
        /// TODO: Add comments and explain the formula
        uint256 archToLevRatio = _paramStore.getArchToLevRatio();
        uint256 tempCalc = (multiplierOfLeverageFromOneCollateral * archPriceInUSDT) / 1 ether;
        uint256 ratioOfColl = (archToLevRatio * 10**decimal) / (archToLevRatio + tempCalc * 10**(18 - decimal));
        uint256 collateralAmount = (stableCoinAmount * ratioOfColl) / 10**decimal;
        return collateralAmount;
    }

    function _getCollateralAmount(
        uint256 stableCoinAmount,
        uint256 cycles,
        address[] memory path,
        uint8 decimal
    ) internal view returns (uint256) {
        // Calculate how much leverage is needed per 1 OUSD. Used throughout the calculation as a constant multiplier
        uint256 multiplierOfLeverageFromOneCollateral = _paramStore.getAllowedLeverageForPosition(1 ether, cycles);
        // Get the price of 1 Arch in stableCoin.
        uint256 archPriceInStable = _uniswapRouter.getAmountsIn(1 ether, path)[0];
        // calculate first estimation of collateral amount, based on price of a single arch token.
        uint256 collateralAmount = _calcCollateralBasedOnArchPrice(
            stableCoinAmount,
            archPriceInStable,
            multiplierOfLeverageFromOneCollateral,
            decimal
        );

        // Now we have an estimate of how much collateral have, so we can calc how much Arch we need
        // Do a second round of calc where everything is the same, just with the Arch price being more accurate
        /// TODO: create method that tranform 6 decimal to 18 decimal
        uint256 collateralAmountIn18Decimal = collateralAmount * 10**(18 - decimal);
        uint256 archAmountEstimated = _paramStore.calculateArchNeededForLeverage(
            ((collateralAmountIn18Decimal) * multiplierOfLeverageFromOneCollateral) / 1 ether
        );
        // Now  that we know how much arch we are going to need to get, we can use Uniswap amountIn method to estimate
        // the actual (much better estimated then before) price in stable coin of 1 Arch token
        archPriceInStable = ((_uniswapRouter.getAmountsIn(archAmountEstimated, path)[0] * 1 ether) / archAmountEstimated);
        collateralAmount = _calcCollateralBasedOnArchPrice(stableCoinAmount, archPriceInStable, multiplierOfLeverageFromOneCollateral, decimal);
        return collateralAmount;
    }

    function _splitStableCoinAmount(
        uint256 stableCoinAmount,
        uint256 cycles,
        address[] memory path,
        address addressStable
    ) internal view returns (uint256 stableForCollateral, uint256 stableForArch) {
        uint8 decimal = _getTokenDecimal(addressStable);
        // Figure out how much of stable goes to OUSD and how much to pay as arch tokens
        uint256 collateralInBaseStableAmount = _getCollateralAmount(stableCoinAmount, cycles, path, decimal);
        // Set aside a bit less for collateral, to reduce risk of revert.
        collateralInBaseStableAmount = (collateralInBaseStableAmount * 990) / 1000;
        uint256 coinsToPayForArchAmount = stableCoinAmount - collateralInBaseStableAmount;
        return (collateralInBaseStableAmount, coinsToPayForArchAmount);
    }

    /// Coin 0 in pool is OUSD
    /// Coint 1 is 3crv
    /// Underlying, using https://etherscan.io/address/0xB9fC157394Af804a3578134A6585C0dc9cc990d4#readContract
    /// On pool OUSD pool 0x87650D7bbfC3A9F10587d7778206671719d9910D
    //  [0] OUSD 0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86 - 18
    //  [1] DAI 0x6B175474E89094C44Da98b954EedeAC495271d0F - 18
    //  [2] USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 - 6
    //  [3] USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7 - 6

    function zapIn(
        uint256 stableCoinAmount,
        uint256 cycles,
        uint16 maxSlippageAllowed,
        address addressBaseStable,
        bool useUserArch
    ) external returns (uint256) {
        // Whats needs to happen?
        // 0) transfer funds from user to this address
        // 1) figure out how much of stable goes to lvUSD and how much to pay as arch tokens
        // 2) exchange stable for Arch
        // 3) exchange stable for OUSD
        ///4 approve both OUSD and Arch to levEngine ( no need as we approve unlimited to LevEngine)
        // 4) open position
        // 5) return NFT

        /// validate input
        require(stableCoinAmount > 0, "err:stableCoinAmount==0");
        require(maxSlippageAllowed > 800 && maxSlippageAllowed < 1000, "err:800<slippage>1000");

        /// Tracollateraln to this address
        _transferFromSender(addressBaseStable, stableCoinAmount);

        /// Setup
        address[] memory path = _getPath(addressBaseStable);
        int128 stableTokenIndex = _getTokenIndex(addressBaseStable);

        // Check if we need are using existing arch tokens owned by user or buying new ones
        uint256 collateralInBaseStableAmount;
        if (useUserArch == true) {
            // We are using owners arch tokens, transfer from msg.sender to address(this)
            collateralInBaseStableAmount = stableCoinAmount;
            _transferUserArchForPosition(stableCoinAmount, cycles, maxSlippageAllowed, addressBaseStable);
        } else {
            // Need to buy Arch tokens. We need to split the stable amount between what we'll as collateral what we'll use to buy Arch
            uint256 coinsToPayForArchAmount;
            (collateralInBaseStableAmount, coinsToPayForArchAmount) = _splitStableCoinAmount(stableCoinAmount, cycles, path, addressBaseStable);
            // By arch tokens. Dont enforce min as we dont quite know what the minimum is. If we dont have enough this will fail when we try to use arch
            // to open position.
            _uniswapRouter.swapExactTokensForTokens(coinsToPayForArchAmount, 0, path, address(this), block.timestamp + 2 minutes);
        }

        /// Exchange OUSD from any of the 3CRV
        _exchangeToOUSD(collateralInBaseStableAmount, (collateralInBaseStableAmount * maxSlippageAllowed) / 1000, stableTokenIndex);
        
        /// get Arch and OUSD balances
        uint256 archBalance = _archToken.balanceOf(address(this));
        uint256 ousdBalance = _ousd.balanceOf(address(this));

        /// create position
        uint256 tokenId = _levEngine.createLeveragedPositionFromZapper(ousdBalance, cycles, archBalance, msg.sender);

        return tokenId;
        /// Return all remaining dust/tokens to user
        // _archToken.transfer(msg.sender, _archToken.balanceOf(address(this)));
        // _ousd.transfer(msg.sender, _ousd.balanceOf(address(this)));
        // _usdt.transfer(msg.sender, _usdt.balanceOf(address(this)));
        // return tokenId;
        // TODO: return dust(s) to user
        /// One way to do it:
        /// No change to lev Engine.
    }

    function _transferUserArchForPosition(
        uint256 stableCoinAmount,
        uint256 cycles,
        uint16 maxSlippageAllowed,
        address addressBaseStable
    ) internal {
        uint256 archAmountToPay = _paramStore.calculateArchNeededForLeverage(
            _paramStore.getAllowedLeverageForPosition(stableCoinAmount * 10**(18 - _getTokenDecimal(addressBaseStable)), cycles)
        );
        _transferFromSender(address(_archToken), (archAmountToPay * 1000) / maxSlippageAllowed);
    }

    function _transferFromSender(address token, uint256 amount) internal {
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    function _exchangeToOUSD(
        uint256 amount,
        uint256 minAmountToReceive,
        int128 fromTokenIndex
    ) internal returns (uint256 amountOUSDReceived) {
        _usdt.safeApprove(address(_poolOUSD3CRV), amount);
        uint256 amountReceived = _poolOUSD3CRV.exchange_underlying(fromTokenIndex, ousdTokenIndex, amount, minAmountToReceive);
        _usdt.safeApprove(address(_poolOUSD3CRV), 0);
        return amountReceived;
    }

    function previewZapIn(
        uint256 stableCoinAmount,
        uint256 minCollateralReturned,
        int128 tokenIndex
    ) external view returns (uint256 nftId) {
        // get_dy_underlying(int128 i,int128 j,uint256 dx
        uint256 coins = _poolOUSD3CRV.get_dy_underlying(3, 0, stableCoinAmount);
        console.log("giving %s 3crv for %s OUSD", stableCoinAmount / 10**6, coins / 1 ether);
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
        address addressUniswapRouter,
        address addressLevEngine,
        address addressArchToken,
        address addressParamStore
    ) external nonReentrant onlyAdmin {
        require(addressOUSD != address(0), "cant set to 0 A");
        require(address3CRV != address(0), "cant set to 0 A");
        require(addressPoolOUSD3CRV != address(0), "cant set to 0 A");

        // Load contracts
        _ousd = IERC20Upgradeable(addressOUSD);
        _usdt = IERC20Upgradeable(addressUSDT);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolOUSD3CRV = ICurveFiCurve(addressPoolOUSD3CRV);
        _uniswapRouter = IUniswapV2Router02(addressUniswapRouter);
        _levEngine = LeverageEngine(addressLevEngine);
        _archToken = IERC20Upgradeable(addressArchToken);
        _paramStore = ParameterStore(addressParamStore);

        /// Need to approve for both Arch and ousd
        _ousd.safeApprove(addressLevEngine, 0);
        _ousd.safeApprove(addressLevEngine, type(uint256).max);

        /// Need to approve for both Arch and ousd
        _archToken.safeApprove(addressLevEngine, 0);
        _archToken.safeApprove(addressLevEngine, type(uint256).max);

        _usdt.safeApprove(address(_uniswapRouter), 0);
        _usdt.safeApprove(address(_uniswapRouter), type(uint256).max);
    }
}
