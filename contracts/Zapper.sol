pragma solidity 0.8.13;

import {ICurveFiCurve} from "./interfaces/ICurveFi.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {AccessController} from "./AccessController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract Zapper is AccessController, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    ICurveFiCurve internal _poolOUSD3CRV;
    IERC20Upgradeable internal _ousd;
    IERC20Upgradeable internal _crv3;

    /// Coin 0 in pool is OUSD
    /// Coint 1 is 3crv
    /// Underlying, using https://etherscan.io/address/0xB9fC157394Af804a3578134A6585C0dc9cc990d4#readContract
    /// [0] OUSD 0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86
    // ,[1] DAI 0x6B175474E89094C44Da98b954EedeAC495271d0F,
    //  [2] USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
    //  [3] USDT 0xdAC17F958D2ee523a2206206994597C13D831ec7

    function zapIn(
        uint256 crvAmount,
        uint256 minCollateralReturned,
        uint8 tokenIndex
    ) external {
        _poolOUSD3CRV.exchange_underlying(3, 0, crvAmount, 10**18, msg.sender);
        // console.log("giving %s 3crv for %s OUSD", crvAmount / 10**6, coins / 1 ether);
    }

    function previewZapIn(
        uint256 crvAmount,
        uint256 minCollateralReturned,
        uint8 tokenIndex
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
        address addressPoolOUSD3CRV
    ) external nonReentrant onlyAdmin {
        require(addressOUSD != address(0), "cant set to 0 A");
        require(address3CRV != address(0), "cant set to 0 A");
        require(addressPoolOUSD3CRV != address(0), "cant set to 0 A");

        // Load contracts
        _ousd = IERC20Upgradeable(addressOUSD);
        _crv3 = IERC20Upgradeable(address3CRV);
        _poolOUSD3CRV = ICurveFiCurve(addressPoolOUSD3CRV);
    }
}
