// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/** This component holds the global lvUSD allocation.
 *** It also "physically" holds the lvUSD tokens
 ***
 *** When a user unwind a position the lvUSD is burned and does NOT return to the bank
 ***
 *** We don't just use balanceOf to get lvUSD balance - we store our own variable
 *** lvUSD contract transferTo minting destination, it doesn't call an arbitrary function on the other contract. That's why we need to "accept" or set the leverage cap
 *** and not just key of balanceOf
 *** Example:
 *** 1) Bank is empty.
 *** 2) Minter mint 100 lvUSD via lvUSD contract. 100 lvUSD is sent to the bank (this is the minting destination)
 *** 3) Admin call setLeverageCap(100) to "accept" the lvUSD the bank just got
 ***
 *** Auctions are the Executive of the bank (allowed to take lvUSD)
 **/

interface ILeverageBankV2 {
    event BurnFunds(uint256 burnAmount);
    event LeverageCapSet(uint256 leverageAmount);

    // this is a privileged function - called by the individual auction component (or the component that deals with building a position)
    function withdrawLeverage(uint256 withdrawAmount, address toAddress) external;

    /// Sets leverage cap. Checks that leverageAmount is equal/lower than lvUSD.balanceOf(bankAddress)
    function setLeverageCap(uint256 leverageAmount) external;

    // sends burnAmount lvUSD tokens to address 0x0000..000
    function burnFundsInBank(uint256 burnAmount) external;

    // get current leverage cap of Bank (different then lvUSD.balanceOf)
    function getBankBalance() external view returns (uint256 balance);
}
