// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface ICoordinator {
    /*================INTERFACE SCRATCH AREA=========*/
    // parameters for contract
    // - lvUSD Token contract address
    // - OUSD Vault contract address
    /*===============================================*/

    /* Privileged functions: Governor */

    /// @dev change origination fee
    ///
    /// How much off principle is taken as protocol fees, each time lvUSD is borrowed
    /// Should emit an event
    ///
    /// @param newFeeRate in percentage
    function changeOriginationFeeRate(uint256 newFeeRate) external;

    /// @dev get origination fee number
    ///
    function getOriginationFeeRate() external view returns (uint256);

    /// @dev update EOA of treasury. EOA is multi-sig.
    ///
    /// @param newTreasuryAddress new EOA address of treasury
    function changeTreasuryAddress(address newTreasuryAddress) external;

    /// @dev get treasury address.
    ///
    function getTreasuryAddress() external view returns (address);

    /* Privileged functions: Executive */

    /// @dev deposit OUSD under NFT ID
    ///
    /// User sends OUSD to the contract. OUSD is written under NFT ID
    ///
    /// @param nftId the Archimedes ERC-721 token id
    /// @param amount the amount of OUSD sent to Archimedes
    /// @param sharesOwner who to send shares to
    function depositCollateralUnderNFT(
        uint256 nftId,
        uint256 amount,
        address sharesOwner
    ) external;

    /// @dev withdraw OUSD under NFT ID
    ///
    /// User withdraw OUSD from the contract
    ///
    /// @param amount sum to withdraw
    /// @param nftId the position token id
    function withdrawCollateralUnderNFT(uint256 amount, uint256 nftId) external;

    /// @dev Borrow lvUSD under NFT ID
    ///
    /// User borrow lvUSD against the OUSD deposited as collateral in Vault
    /// Need to check collaterallization ratio
    /// Need to collect origination fee and sent them to vault
    ///
    /// @param _amount the amount of lvUSD requested
    /// @param _nftId the Archimedes ERC-721 token id
    function borrowUnderNFT(uint256 _amount, uint256 _nftId) external;

    /// @dev Repay lvUSD under NFT ID
    ///
    /// User repay lvUSD against the OUSD deposited as collateral
    /// Need to check collaterallization ratio
    ///
    /// @param _amount the amount of lvUSD requested
    /// @param _nftId the Archimedes ERC-721 token id
    function repayUnderNFT(uint256 _amount, uint256 _nftId) external;

    /* Non-privileged functions */
    /// TODO: Should this be accessed by admin only or not? <<<<
    /// @dev deposit OUSD under address (vs. under NFT token ID)
    ///
    /// User sends OUSD to the contract. OUSD is written under msg.sender
    ///
    /// @param _amount the amount of OUSD sent to Archimedes
    function depositCollateralUnderAddress(uint256 _amount) external;

    /// @dev withraw OUSD under address (vs. under NFT token ID)
    ///
    /// User withraw OUSD to the contract
    /// If user borrowed lvUSD against OUSD, they need to repay at least some of the
    /// borrowed lvUSD first (to bring collateral ratio below the threshold)
    ///
    /// @param _amount the amount of OUSD user request to withdraw
    function withdrawCollateralUnderAddress(uint256 _amount) external;

    /// @dev Borrow lvUSD under address (vs. under NFT token ID)
    ///
    /// User borrow lvUSD against the OUSD deposited as collateral
    /// Need to check collaterallization ratio
    /// Need to collect origination fee and sent them to vault
    ///
    /// @param _amount the amount of lvUSD requested
    function borrowUnderAddress(uint256 _amount) external;

    /// @dev Borrow lvUSD under address (vs. under NFT token ID)
    ///
    /// User borrow lvUSD against the OUSD deposited as collateral
    /// Need to check collaterallization ratio
    ///
    /// @param _amount the amount of lvUSD requested
    function repayUnderAddress(uint256 _amount) external;

    /// @dev returns the address of lvUSD contract on file
    function addressOfLvUSDToken() external returns (address);

    /// @dev returns the address of VaultOUSD contract on file
    function addressOfVaultOUSDToken() external returns (address);
}
