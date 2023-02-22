// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {LeverageEngine} from "../contracts/LeverageEngine.sol";
import {IUniswapV2Router02} from "../contracts/interfaces/IUniswapV2Router02.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {AccessController} from "./AccessController.sol";
import {ParameterStore} from "./ParameterStore.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Zapper is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ICurveFiCurve internal _poolOUSD3CRV;
    IUniswapV2Router02 internal _uniswapRouter;
    IERC20Upgradeable internal _ousd;
    IERC20Upgradeable internal _usdt;
    IERC20Upgradeable internal _usdc;
    IERC20Upgradeable internal _dai;
    LeverageEngine internal _levEngine;
    IERC20Upgradeable internal _archToken;
    ParameterStore internal _paramStore;

    // positionID, // Position ID of the position NFT
    // totalStableAmount, // Total amount of user stable coin zapped in
    // address baseStableAddress, // Base stable address of the stable coin contract
    // bool usedUserArch // Bool representing if user's Arch was used or not

    event ZapIn(uint256 positionID, uint256 totalStableAmount, address baseStableAddress, bool usedUserArch);

    /*
        @dev Exchange base stable to OUSD and Arch and create position 

        @param stableCoinAmount Amount of stable coin to zap(exchange) into Arch and OUSD
        @param cycles Number of cycles for open position call (determine how much lvUSD will be borrowed)
        @param archMinAmount Minimum amount of Arch tokens to buy 
        @param ousdMinAmount Minimum amount of OUSD to buy
        @param maxSlippageAllowed Max slippage allowed in basis points (1/1000). 1000 = 100%
        @param addressBaseStable Address of base stable coin to use for zap
        @param useUserArch If true, will use user arch tokens to open position. If false, will buy arch tokens
    */
    function zapIn(
        uint256 stableCoinAmount,
        uint256 cycles,
        uint256 archMinAmount,
        uint256 ousdMinAmount,
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

        // get a base line of how much stable is under management on conract - should be zero but creating a new base line
        /// validate input
        require(stableCoinAmount > 0, "err:stableCoinAmount==0");
        require(maxSlippageAllowed < 1000, "err:slippage>999");
        require(maxSlippageAllowed > 959, "err:slippage<960");

        // Now we apply slippage. We reduce the min of OUSD
        // This is because we need to always have enough Arch to pay so better to have a bit less OUSD and more Arch than
        // the other way around
        ousdMinAmount = (ousdMinAmount * maxSlippageAllowed) / 1000;

        /// transfer base stable coin from user to this address
        _transferFromSender(addressBaseStable, stableCoinAmount);

        /// Setup
        address[] memory path = _getPath(addressBaseStable);
        uint256 collateralInBaseStableAmount = stableCoinAmount;
        uint256 ousdAmount;

        if (useUserArch == false) {
            // Need to buy Arch tokens. We already know how much Arch tokens we want. We still need to know the Max in stable that
            // we are willing to pay. For that, we're running the splitEstimate again and adding a small buffer
            uint256 coinsToPayForArchAmount;
            (collateralInBaseStableAmount, coinsToPayForArchAmount) = _splitStableCoinAmount(stableCoinAmount, cycles, path, addressBaseStable);
            /// since we basivally add a buffer for max stable to take, its actually a built in limit on how much slippage is allowed.
            /// In this case up to 5%
            uint256 maxStableToPayForArch = (coinsToPayForArchAmount * 1000) / maxSlippageAllowed;
            // Now swap exact archMinAmount for a maximum of maxStableToPayForArch in stable coin
            uint256 stableUsedForArch = _uniswapRouter.swapTokensForExactTokens(
                archMinAmount,
                maxStableToPayForArch,
                path,
                address(this),
                block.timestamp + 1 minutes
            )[0];

            /// Exchange OUSD from any of the 3CRV. Will revert if didn't get min amount sent (2nd parameter)
            // Now spend all the remainign stable to buy OUSD
            ousdAmount = _exchangeToOUSD(stableCoinAmount - stableUsedForArch, ousdMinAmount, addressBaseStable);
        }

        // Check if we are using existing arch tokens owned by user or buying new ones
        if (useUserArch == true) {
            // First, exchange ALL stable coin to OUSD
            ousdAmount = _exchangeToOUSD(stableCoinAmount, ousdMinAmount, addressBaseStable);
            // We are using owners arch tokens, transfer from msg.sender to address(this)
            uint256 archToTransfer = _getArchAmountToTransferFromUser(ousdAmount, cycles);
            require(_archToken.balanceOf(msg.sender) >= archToTransfer, "err:insuf user arch");
            require(_archToken.allowance(msg.sender, address(this)) >= archToTransfer, "err:insuf approval arch");
            _transferFromSender(address(_archToken), archToTransfer);
        }

        // calculate min position leverage allowed
        uint256 minLeverageOUSD = (_paramStore.getAllowedLeverageForPosition(ousdAmount, cycles) * maxSlippageAllowed) / 1000;
        // create position
        uint256 tokenId = _levEngine.createLeveragedPositionFromZapper(
            ousdAmount,
            cycles,
            _archToken.balanceOf(address(this)),
            msg.sender,
            minLeverageOUSD
        );

        /// Return all remaining dust/tokens to user
        _archToken.safeTransfer(msg.sender, _archToken.balanceOf(address(this)));

        emit ZapIn(tokenId, stableCoinAmount, addressBaseStable, useUserArch);

        return tokenId;
    }

    /*
        @dev simulate OUSD and Arch tokens that will be returned from zapIn call

        @param stableCoinAmount Amount of stable coin to zap(exchange) into Arch and OUSD
        @param cycles Number of cycles for open position call (determine how much lvUSD will borrowed)
        @param addressBaseStable Address of base stable coin to use for zap
        @param useUserArch If true, will use user arch tokens to open position. If false, will buy arch tokens
    */
    function previewZapInAmount(
        uint256 stableCoinAmount,
        uint256 cycles,
        address addressBaseStable,
        bool useUserArch
    ) external view returns (uint256 ousdCollateralAmountReturn, uint256 archTokenAmountReturn) {
        /// Setup
        uint256 ousdCollateralAmount;
        uint256 archTokenAmount;

        address[] memory path = _getPath(addressBaseStable);
        int128 stableTokenIndex = _getTokenIndex(addressBaseStable);
        uint256 collateralInBaseStableAmount = stableCoinAmount;

        if (useUserArch == false) {
            // Need to buy Arch tokens. We need to split the stable amount between what we'll as collateral what we'll use to buy Arch
            uint256 coinsToPayForArchAmount;
            (collateralInBaseStableAmount, coinsToPayForArchAmount) = _splitStableCoinAmount(stableCoinAmount, cycles, path, addressBaseStable);
            // preview buy arch tokens from uniswap. results from this will be used as mimimum for Arch to get
            if (addressBaseStable == _ADDRESS_USDC) {
                archTokenAmount = _uniswapRouter.getAmountsOut(coinsToPayForArchAmount, path)[1];
            } else {
                archTokenAmount = _uniswapRouter.getAmountsOut(coinsToPayForArchAmount, path)[2];
            }
        }

        // estimate exchange with curve pool
        ousdCollateralAmount = _poolOUSD3CRV.get_dy_underlying(stableTokenIndex, _OUSD_TOKEN_INDEX, collateralInBaseStableAmount);

        if (useUserArch == true) {
            // We are using owners arch tokens, calculate transfer amount from msg.sender to address(this)
            archTokenAmount = _getArchAmountToTransferFromUser(ousdCollateralAmount, cycles);
        }

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
        uint256 archPriceInStable,
        uint256 multiplierOfLeverageFromOneCollateral,
        uint8 decimal
    ) internal view returns (uint256 collateralAmountReturned) {
        /// TODO: Add comments and explain the formula
        uint256 archToLevRatio = _paramStore.getArchToLevRatio();
        uint256 tempCalc = (multiplierOfLeverageFromOneCollateral * archPriceInStable) / 1 ether;
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
        collateralInBaseStableAmount = (collateralInBaseStableAmount * 999) / 1000;
        uint256 coinsToPayForArchAmount = stableCoinAmount - collateralInBaseStableAmount;
        return (collateralInBaseStableAmount, coinsToPayForArchAmount);
    }

    /***************************************************************
     * transfer methods
     **************************************************************/

    function _getArchAmountToTransferFromUser(uint256 ousdAmount, uint256 cycles) internal view returns (uint256) {
        return _paramStore.calculateArchNeededForLeverage(_paramStore.getAllowedLeverageForPosition(ousdAmount, cycles));
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
    address internal constant _ADDRESS_OUSD = 0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86;
    address internal constant _ADDRESS_3CRV = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address internal constant _ADDRESS_OUSD3CRV_POOL = 0x87650D7bbfC3A9F10587d7778206671719d9910D;
    address internal constant _ADDRESS_UNISWAP_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
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

    // _getPath determines the Uniswap exchange path
    // There exists a USDC / ARCH Uniswap pool
    // If the user has USDT or DAI we must first convert to USDC
    function _getPath(address addressBaseStable) internal view returns (address[] memory) {
        address[] memory path;
        if (addressBaseStable == _ADDRESS_USDC) {
            // Base stable is already USDC, no conversion needed
            path = new address[](2);
            path[0] = addressBaseStable;
            path[1] = address(_archToken);
        } else {
            // Base stable is not USDC, must convert to USDC first
            path = new address[](3);
            path[0] = addressBaseStable;
            path[1] = _ADDRESS_USDC;
            path[2] = address(_archToken);
        }
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
        address addressLevEngine,
        address addressArchToken,
        address addressParamStore
    ) external nonReentrant onlyAdmin {
        // Load contracts
        _ousd = IERC20Upgradeable(_ADDRESS_OUSD);
        _usdt = IERC20Upgradeable(_ADDRESS_USDT);
        _usdc = IERC20Upgradeable(_ADDRESS_USDC);
        _dai = IERC20Upgradeable(_ADDRESS_DAI);
        _poolOUSD3CRV = ICurveFiCurve(_ADDRESS_OUSD3CRV_POOL);
        _uniswapRouter = IUniswapV2Router02(_ADDRESS_UNISWAP_ROUTER);
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
