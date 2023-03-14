// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface ICoordinator {
    /*================INTERFACE SCRATCH AREA=========*/
    // parameters for contract
    // - lvUSD Token contract address
    // - OUSD Vault contract address
    /*===============================================*/

    /* Privileged functions: Executive */

    /// @dev deposit OUSD under NFT ID
    ///
    /// User sends OUSD to the contract. OUSD is written under NFT ID
    ///
    /// @param _nftId the Archimedes ERC-721 token id
    /// @param _amountInOUSD the amount of OUSD sent to Archimedes
    function depositCollateralUnderNFT(uint256 _nftId, uint256 _amountInOUSD) external;

    /// @dev Borrow lvUSD under NFT ID
    ///
    /// User borrow lvUSD against the OUSD deposited as collateral in Vault
    /// Need to check collaterallization ratio
    /// Need to collect origination fee and sent them to vault
    ///
    /// @param _amountLvUSDToBorrow the amount of lvUSD requested
    /// @param _nftId the Archimedes ERC-721 token id
    function borrowUnderNFT(uint256 _nftId, uint256 _amountLvUSDToBorrow) external;

    /// @dev Repay lvUSD under NFT ID
    ///
    /// User repay lvUSD against the OUSD deposited as collateral
    /// Need to check collaterallization ratio
    ///
    /// @param _amountLvUSDToRepay the amount of lvUSD requested
    /// @param _nftId the Archimedes ERC-721 token id
    function repayUnderNFT(uint256 _nftId, uint256 _amountLvUSDToRepay) external;

    /// @dev borrow lvUSD and exchange it for OUSD
    /// @param _nftId NFT ID
    /// @param _amountToLeverage amount to borrow
    function getLeveragedOUSD(uint256 _nftId, uint256 _amountToLeverage) external;

    /// @dev unwind position by repaying lvUSD debt using existing OUSD funds in position
    /// @param _nftId NFT ID
    /// @param _userAddress address to transfer leftover OUSD to
    function unwindLeveragedOUSD(uint256 _nftId, address _userAddress) external returns (uint256 positionWindfall);

    /// @dev returns the address of lvUSD contract on file
    function addressOfLvUSDToken() external returns (address);

    /// @dev returns the address of VaultOUSD contract on file
    function addressOfVaultOUSDToken() external returns (address);

    function getAvailableLeverage() external view returns (uint256);

    /// @dev callthrough to CDP to get expiration timestamp
    /// @param _nftId NFT ID
    function getPositionExpireTime(uint256 _nftId) external view returns (uint256);
}
