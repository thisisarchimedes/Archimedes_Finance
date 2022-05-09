// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

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
    /// @param _sharesOwner who to send shares to
    function depositCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amountInOUSD,
        address _sharesOwner
    ) external;

    /// @dev withdraw OUSD under NFT ID
    ///
    /// User withdraw OUSD from the contract
    ///
    /// @param _nftId the position token id
    /// @param _amount OUSD amount
    /// @param _to address to transfer principle to
    function withdrawCollateralUnderNFT(
        uint256 _nftId,
        uint256 _amount,
        address _to
    ) external;

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
    /// @param _sharesOwner address to apply shares to
    function getLeveragedOUSD(
        uint256 _nftId,
        uint256 _amountToLeverage,
        address _sharesOwner
    ) external;

    /// @dev unwind position by repaying lvUSD debt using existing OUSD funds in position
    /// @param _nftId NFT ID
    /// @param _userAddress address to transfer leftover OUSD to
    /// @param _sharesOwner address of shares owner (position don't own shares, just has a value on how much shares it should get)
    function unwindLeveragedOUSD(
        uint256 _nftId,
        address _userAddress,
        address _sharesOwner
    ) external;

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
