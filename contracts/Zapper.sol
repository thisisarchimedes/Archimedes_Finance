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
    IERC20Upgradeable internal _usdc;
    IERC20Upgradeable internal _dai;
    IERC20Upgradeable internal _crv3;
    LeverageEngine internal _levEngine;
    IERC20Upgradeable internal _archToken;
    ParameterStore internal _paramStore;

    /*
        @dev Exchange base stable to OUSD and Arch and create position 

        @param stableCoinAmount Amount of stable coin to zap(exchange) into Arch and OUSD
        @param cycles Number of cycles for open position call (determine how much lvUSD will borrowed)
        @param maxSlippageAllowed Max slippage allowed for all token exchanges. For more accuracy uses 1000 for 100%
        @param addressBaseStable Address of base stable coin to use for zap
        @param useUserArch If true, will use user arch tokens to open position. If false, will buy arch tokens
    */
    function zapIn(
        uint256 stableCoinAmount,
        uint256 cycles,
        uint16 maxSlippageAllowed,
        address addressBaseStable,
        bool useUserArch
    ) external returns (uint256) {
        // Whats needs to happen?
        // -1) validate input
        // 0) transfer funds from user to this address
        // 1) figure out how much of stable goes to collateral and how much to pay as arch tokens
        // 2) exchange stable for Arch/ Take from user wallet
        // 3) exchange stable for OUSD
        // 4) open position
        // 5) return NFT to user

        /// validate input
        require(stableCoinAmount > 0, "err:stableCoinAmount==0");
        require(maxSlippageAllowed > 800 && maxSlippageAllowed < 1000, "err:800<slippage>1000");

        /// transfer base stable coin from user to this address
        _transferFromSender(addressBaseStable, stableCoinAmount);

        /// Setup
        address[] memory path = _getPath(addressBaseStable);
        uint256 collateralInBaseStableAmount;
        uint256 archAmount;

        // Check if we are using existing arch tokens owned by user or buying new ones
        if (useUserArch == true) {
            // We are using owners arch tokens, transfer from msg.sender to address(this)
            collateralInBaseStableAmount = stableCoinAmount;
            archAmount = _transferUserArchForPosition(stableCoinAmount, cycles, maxSlippageAllowed, addressBaseStable);
        } else {
            // Need to buy Arch tokens. We need to split the stable amount between what we'll use as collateral and what we'll use to buy Arch
            uint256 coinsToPayForArchAmount;
            (collateralInBaseStableAmount, coinsToPayForArchAmount) = _splitStableCoinAmount(stableCoinAmount, cycles, path, addressBaseStable);
            // Buy arch tokens. Dont enforce min as we dont quite know what the minimum is. If we dont have enough this will fail when we try to use arch
            // to open position.
            _uniswapRouter.swapExactTokensForTokens(coinsToPayForArchAmount, 0, path, address(this), block.timestamp + 2 minutes);
        }

        /// Exchange OUSD from any of the 3CRV. Will revert if didn't get min amount sent (2nd parameter)
        uint256 ousdAmount = _exchangeToOUSD(
            collateralInBaseStableAmount,
            (collateralInBaseStableAmount * maxSlippageAllowed) / 1000,
            addressBaseStable
        );

        /// create position
        uint256 tokenId = _levEngine.createLeveragedPositionFromZapper(ousdAmount, cycles, _archToken.balanceOf(address(this)), msg.sender);

        /// Return all remaining dust/tokens to user
        _archToken.transfer(msg.sender, _archToken.balanceOf(address(this)));

        return tokenId;
    }

    /*
        @dev simulate OUSD and Arch tokens that will be returned from zapIn call

        @param stableCoinAmount Amount of stable coin to zap(exchange) into Arch and OUSD
        @param cycles Number of cycles for open position call (determine how much lvUSD will borrowed)
        @param maxSlippageAllowed Max slippage allowed for all token exchanges. For more accuracy uses 1000 for 100%
        @param addressBaseStable Address of base stable coin to use for zap
        @param useUserArch If true, will use user arch tokens to open position. If false, will buy arch tokens
    */
    function previewZapInAmount(
        uint256 stableCoinAmount,
        uint256 cycles,
        uint16 maxSlippageAllowed,
        address addressBaseStable,
        bool useUserArch
    ) external view returns (uint256 ousdCollateralAmountReturn, uint256 archTokenAmountReturn) {
        /// Setup
        uint256 ousdCollateralAmount;
        uint256 archTokenAmount;

        address[] memory path = _getPath(addressBaseStable);
        int128 stableTokenIndex = _getTokenIndex(addressBaseStable);
        uint256 collateralInBaseStableAmount;

        // TODO: make more sense to estimate Arch once we know how much OUSD we got
        // Check if we need are using existing arch tokens owned by user or buying new ones
        if (useUserArch == true) {
            // We are using owners arch tokens, transfer from msg.sender to address(this)
            collateralInBaseStableAmount = stableCoinAmount;
            archTokenAmount = _getArchAmountToTransferFromUser(stableCoinAmount, cycles, addressBaseStable);
            archTokenAmount = (archTokenAmount * 1000) / maxSlippageAllowed;
        } else {
            // Need to buy Arch tokens. We need to split the stable amount between what we'll as collateral what we'll use to buy Arch
            uint256 coinsToPayForArchAmount;
            (collateralInBaseStableAmount, coinsToPayForArchAmount) = _splitStableCoinAmount(stableCoinAmount, cycles, path, addressBaseStable);
            // By arch tokens. Dont enforce min as we dont quite know what the minimum is. If we dont have enough this will fail when we try to use arch
            // to open position.
            archTokenAmount = _uniswapRouter.getAmountsOut(coinsToPayForArchAmount, path)[2];
        }

        /// Exchange OUSD from any of the 3CRV. Will revert if didn't get min amount sent (2nd parameter)
        ousdCollateralAmount = _poolOUSD3CRV.get_dy_underlying(stableTokenIndex, _OUSD_TOKEN_INDEX, collateralInBaseStableAmount);
        require(ousdCollateralAmount >= ((collateralInBaseStableAmount * maxSlippageAllowed) / 1000), "err:less OUSD the min");
        return (ousdCollateralAmount, archTokenAmount);
    }

    /*
        @dev estimate how much of base stable will be used to get Arch and how much will be used to get OUSD 
        @param stableCoinAmount Amount of stable coin to zap(exchange) into Arch and OUSD
        @param cycles Number of cycles for open position call (determine how much lvUSD will borrowed)
        @param addressBaseStable Address of base stable coin to use for zap
    */
    function previewTokenSplit(
        uint256 stableCoinAmount,
        uint256 cycles,
        address addressBaseStable
    ) external view returns (uint256 collateralInBaseStableAmount, uint256 coinsToPayForArchInStableAmount) {
        address[] memory path = _getPath(addressBaseStable);
        return _splitStableCoinAmount(stableCoinAmount, cycles, path, addressBaseStable);
    }

    /***************************************************************
    Split stable coin methods to collateral amount and arch amount
    ***************************************************************/
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

    // TODO: pass it the max slippege allowed for line 196
    function _splitStableCoinAmount(
        uint256 stableCoinAmount,
        uint256 cycles,
        address[] memory path,
        address addressStable
    ) internal view returns (uint256 stableForCollateral, uint256 stableForArch) {
        uint8 decimal = _getTokenDecimal(addressStable);
        // Figure out how much of stable goes to OUSD and how much to pay as arch tokens
        uint256 collateralInBaseStableAmount = _getCollateralAmount(stableCoinAmount, cycles, path, decimal);
        // Set aside a bit less for collateral, to reduce risk of revert
        // TODO: do we actually need this buffer down?
        collateralInBaseStableAmount = (collateralInBaseStableAmount * 990) / 1000;
        uint256 coinsToPayForArchAmount = stableCoinAmount - collateralInBaseStableAmount;
        return (collateralInBaseStableAmount, coinsToPayForArchAmount);
    }

    /***************************************************************
     * transfer methods
     **************************************************************/
    function _transferUserArchForPosition(
        uint256 stableCoinAmount,
        uint256 cycles,
        uint16 maxSlippageAllowed,
        address addressBaseStable
    ) internal returns (uint256) {
        uint256 archAmountToPay = _getArchAmountToTransferFromUser(stableCoinAmount, cycles, addressBaseStable);
        archAmountToPay = (archAmountToPay * 1000) / maxSlippageAllowed;
        // Ensure owner has enough arch tokens
        require(_archToken.balanceOf(msg.sender) >= archAmountToPay, "err:insuf user arch");
        _transferFromSender(address(_archToken), archAmountToPay);
        return archAmountToPay;
    }

    function _getArchAmountToTransferFromUser(
        uint256 stableCoinAmount,
        uint256 cycles,
        address addressBaseStable
    ) internal view returns (uint256) {
        return
            _paramStore.calculateArchNeededForLeverage(
                _paramStore.getAllowedLeverageForPosition(stableCoinAmount * 10**(18 - _getTokenDecimal(addressBaseStable)), cycles)
            );
    }

    function _transferFromSender(address tokenAddress, uint256 amount) internal {
        IERC20Upgradeable(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
    }

    function _exchangeToOUSD(
        uint256 amount,
        uint256 minAmountToReceive,
        address addressBaseStable
    ) internal returns (uint256 amountOUSDReceived) {
        IERC20Upgradeable(addressBaseStable).safeApprove(address(_poolOUSD3CRV), amount);
        int128 fromTokenIndex = _getTokenIndex(addressBaseStable);
        uint256 amountReceived = _poolOUSD3CRV.exchange_underlying(fromTokenIndex, _OUSD_TOKEN_INDEX, amount, minAmountToReceive);
        IERC20Upgradeable(addressBaseStable).safeApprove(address(_poolOUSD3CRV), 0);
        return amountReceived;
    }

    /***************************************************************
    Coin management methods
    ***************************************************************/

    address internal constant _ADDRESS_USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address internal constant _ADDRESS_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address internal constant _ADDRESS_DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address internal constant _ADDRESS_WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant _ADDRESS_UNISWAP_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    int128 internal constant _OUSD_TOKEN_INDEX = 0;

    /// Coin 0 in pool is OUSD
    /// Coin 1 in pool is DAI
    /// Coin 2 in pool is USDC
    /// Coin 3 in pool is USDT
    /// using https://etherscan.io/address/0xB9fC157394Af804a3578134A6585C0dc9cc990d4#readContract
    /// On pool OUSD pool 0x87650D7bbfC3A9F10587d7778206671719d9910D
    /// CurveIndex, name, address - decimals
    //  [0] OUSD 0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86 - 18
    //  [1] DAI 0x6B175474E89094C44Da98b954EedeAC495271d0F - 18
    //  [2] USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 - 6
    //  [3] USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7 - 6

    function _getPath(address addressBaseStable) internal view returns (address[] memory) {
        address[] memory path = new address[](3);
        path[0] = addressBaseStable;
        path[1] = _ADDRESS_WETH9;
        path[2] = address(_archToken);
        return path;
    }

    function _getTokenIndex(address addressBaseStable) internal pure returns (int128 tokenIndex) {
        if (addressBaseStable == _ADDRESS_USDT) {
            return tokenIndex = 3;
        }
        if (addressBaseStable == _ADDRESS_USDC) {
            return tokenIndex = 2;
        }
        if (addressBaseStable == _ADDRESS_DAI) {
            return tokenIndex = 1;
        }
        revert("Zapper: Unsupported stablecoin");
    }

    function _getTokenDecimal(address addressBaseStable) internal pure returns (uint8) {
        if (addressBaseStable == _ADDRESS_USDT) {
            return 6;
        }
        if (addressBaseStable == _ADDRESS_USDC) {
            return 6;
        }
        if (addressBaseStable == _ADDRESS_DAI) {
            return 18;
        }
        revert("Zapper: Unsupported stablecoin");
    }

    /***************************************************************
    Admin methods
    ***************************************************************/

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
        /// TODO: Change whatever static address to the const address we have on this contract
        _ousd = IERC20Upgradeable(addressOUSD);
        _usdt = IERC20Upgradeable(addressUSDT);
        _usdc = IERC20Upgradeable(_ADDRESS_USDC);
        _dai = IERC20Upgradeable(_ADDRESS_DAI);
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

        _usdc.safeApprove(address(_uniswapRouter), 0);
        _usdc.safeApprove(address(_uniswapRouter), type(uint256).max);

        _dai.safeApprove(address(_uniswapRouter), 0);
        _dai.safeApprove(address(_uniswapRouter), type(uint256).max);
    }
}
