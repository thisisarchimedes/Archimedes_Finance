const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");
const { BigNumber, FixedFormat, FixedNumber, formatFixed, parseFixed } = require("@ethersproject/bignumber");

const getEighteenDecimal = (naturalNumber) => {
    return ethers.utils.parseEther(naturalNumber.toString());
};

describe("CDPosition test suit", async function () {
    async function validateCDP(nftID, principle, interestEarned, total, borrowed, shares) {
        expect(await cdp.getOUSDPrinciple(nftID)).to.equal(principle);
        expect(await cdp.getOUSDInterestEarned(nftID)).to.equal(interestEarned);
        expect(await cdp.getOUSDTotal(nftID)).to.equal(total);
        expect(await cdp.getLvUSDBorrowed(nftID)).to.equal(borrowed);
        expect(await cdp.getShares(nftID)).to.equal(shares);
    }

    let cdp;

    const NFT_ID = 1234;
    const NFT_ID_SECONDARY = 67889;
    const BASIC_OUSD_PRINCIPLE_NATURAL = 1000000;
    const SHARES = 100;
    // No OUSD tokens need to be transferred for CDP testing. CDP does not hold the tokens nor does it
    // know about OUSD contract state. It just keeps track of the positions for internal accounting.
    const BASIC_OUSD_PRINCIPLE = getEighteenDecimal(BASIC_OUSD_PRINCIPLE_NATURAL);

    beforeEach(async () => {
        let contract = await ethers.getContractFactory("CDPosition");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        cdp = await contract.deploy();
    });

    describe("Create position", () => {
        it("Should create position", async function () {
            // create a new position
            await cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES);

            // validate CDP Values
            await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, 0, SHARES);
        });
        it("Should not create position on existing NFT ID", async function () {
            // create a new position
            await cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES);
            // Try to create position again, expect to revert
            await expect(cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES)).to.be.revertedWith("NFT ID must not exist");
        });
    });

    describe("Delete Position", function () {
        it("Should delete position", async function () {
            await cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES);
            // validate CDP Values
            await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, 0, SHARES);
            await cdp.deletePosition(NFT_ID);

            // Create new NFT position on the same NFT ID. If can create new position, it means same NFT ID was deleted
            await cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES);
            await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, 0, SHARES);
        });

        it("Should not delete position if position still has borrowed lvUSD", async function () {
            await cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES);
            cdp.borrowLvUSDFromPosition(NFT_ID, getEighteenDecimal(100));
            await expect(cdp.deletePosition(NFT_ID)).to.be.revertedWith("Borrowed LvUSD must be zero before deleting");
        });
        it("Should not delete position if NFT ID does not exist in mapping", async function () {
            await expect(cdp.deletePosition(NFT_ID)).to.be.revertedWith("NFT ID must exist");
        });
    });

    describe("Borrow and deposit actions for position", function () {
        const LVUSD_AMOUNT_NATURAL = 10000;
        const LVUSD_AMOUNT = getEighteenDecimal(LVUSD_AMOUNT_NATURAL);
        const OUSD_AMOUNT_NATURAL = 50000;
        const OUSD_AMOUNT = getEighteenDecimal(OUSD_AMOUNT_NATURAL);
        const SHARES = 100;
        beforeEach(async function () {
            // create a new position
            await cdp.createPosition(NFT_ID, BASIC_OUSD_PRINCIPLE, SHARES);
        });

        /* borrowLvUSDFromPosition section */
        it("Should mark up borrowed LvUSD from NFT position", async function () {
            await cdp.borrowLvUSDFromPosition(NFT_ID, LVUSD_AMOUNT);
            await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, LVUSD_AMOUNT, 100);
        });

        /* repayLvUSDToPosition section */

        it("Should mark down repayed lvUSD from NFT position", async function () {
            // borrow lvUSD before trying to repay lvUSD
            await cdp.borrowLvUSDFromPosition(NFT_ID, LVUSD_AMOUNT);

            await cdp.repayLvUSDToPosition(NFT_ID, getEighteenDecimal(1000));
            await validateCDP(
                NFT_ID,
                BASIC_OUSD_PRINCIPLE,
                0,
                BASIC_OUSD_PRINCIPLE,
                getEighteenDecimal(LVUSD_AMOUNT_NATURAL - 1000),
                100
            );
        });

        it("Should not mark down repayed lvUSD if not enough borrowed lvUSD", async function () {
            await expect(cdp.repayLvUSDToPosition(NFT_ID, getEighteenDecimal(1000))).to.be.revertedWith(
                "lvUSD Borrowed amount must be greater or equal than amount to repay"
            );
        });

        /* depositOUSDtoPosition section */

        it("Should mark up deposited OUSD in NFT position", async function () {
            await cdp.depositOUSDtoPosition(NFT_ID, OUSD_AMOUNT);
            await validateCDP(
                NFT_ID,
                BASIC_OUSD_PRINCIPLE,
                0,
                getEighteenDecimal(OUSD_AMOUNT_NATURAL + BASIC_OUSD_PRINCIPLE_NATURAL),
                0,
                SHARES
            );
        });

        /* withdrawOUSDFromPosition */

        it("Should mark down OUSD withdrawn from position", async function () {
            // await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, 0, true)
            await cdp.withdrawOUSDFromPosition(NFT_ID, getEighteenDecimal(30000));
            await validateCDP(
                NFT_ID,
                BASIC_OUSD_PRINCIPLE,
                0,
                getEighteenDecimal(BASIC_OUSD_PRINCIPLE_NATURAL - 30000),
                0,
                SHARES
            );
        });

        it("Should mark down OUSD withdrawn from position taking into account OUSD deposited after principle ", async function () {
            // deposit OUSD before withdrawing from position
            await cdp.depositOUSDtoPosition(NFT_ID, OUSD_AMOUNT);
            let OUSDBalanceInTotalAfterDepositNatural = BASIC_OUSD_PRINCIPLE_NATURAL + OUSD_AMOUNT_NATURAL;
            await validateCDP(
                NFT_ID,
                BASIC_OUSD_PRINCIPLE,
                0,
                getEighteenDecimal(OUSDBalanceInTotalAfterDepositNatural),
                0,
                SHARES
            );

            await cdp.withdrawOUSDFromPosition(NFT_ID, getEighteenDecimal(30000));
            await validateCDP(
                NFT_ID,
                BASIC_OUSD_PRINCIPLE,
                0,
                getEighteenDecimal(OUSDBalanceInTotalAfterDepositNatural - 30000),
                0,
                SHARES
            );
        });

        it("Should not mark down withdraw OUSD if total deposited OUSD is lower then amount to withdraw", async function () {
            await expect(cdp.withdrawOUSDFromPosition(NFT_ID, getEighteenDecimal(1100000))).to.be.revertedWith(
                "OUSD total amount must be greater or equal than amount to withdraw"
            );
        });

        it("Shouldn't allow to borrow more lvUSD if we above collateral rate", async function () {
            totalOUSD = await cdp.getOUSDTotal(NFT_ID);

            // try to borrow more than totalOUSD - expect revert
            await expect(cdp.borrowLvUSDFromPosition(NFT_ID, totalOUSD + OUSD_AMOUNT)).to.be.revertedWith(
                "Attempt to borrow to much lvUSD"
            );
        });
    });

    describe("Make sure that changes to a specific NFT ID CDP struct does not effect other NFT IDs struct", function () {
        let nftIDMainPrinciple = BASIC_OUSD_PRINCIPLE;
        let nftIDSecondaryPrinciple = getEighteenDecimal(BASIC_OUSD_PRINCIPLE_NATURAL * 2);
        beforeEach(async function () {
            // create two NFT ID positions with different values
            await cdp.createPosition(NFT_ID, nftIDMainPrinciple, SHARES);
            await cdp.createPosition(NFT_ID_SECONDARY, nftIDSecondaryPrinciple, SHARES);
        });

        it("Should have two CDP entries", async function () {
            await validateCDP(NFT_ID, nftIDMainPrinciple, 0, nftIDMainPrinciple, 0, SHARES);
            await validateCDP(NFT_ID_SECONDARY, nftIDSecondaryPrinciple, 0, nftIDSecondaryPrinciple, 0, SHARES);
        });

        let amountInOUSDToDeposit = getEighteenDecimal(1500);
        let amountInLvUSDToBorrow = getEighteenDecimal(700);
        let nftIDMainExpectedOUSDTotal = getEighteenDecimal(BASIC_OUSD_PRINCIPLE_NATURAL + 1500);

        it("Should update OUSD total just for main NFT ID", async function () {
            // Deposit OUSD into struct
            await cdp.depositOUSDtoPosition(NFT_ID, amountInOUSDToDeposit);
            await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, nftIDMainExpectedOUSDTotal, 0, SHARES);
            await validateCDP(NFT_ID_SECONDARY, nftIDSecondaryPrinciple, 0, nftIDSecondaryPrinciple, 0, SHARES);
        });

        it("Should update multiple fields in CDP struct for a specific address", async function () {
            await cdp.depositOUSDtoPosition(NFT_ID, amountInOUSDToDeposit);
            await cdp.borrowLvUSDFromPosition(NFT_ID, amountInLvUSDToBorrow);
            await validateCDP(NFT_ID, BASIC_OUSD_PRINCIPLE, 0, nftIDMainExpectedOUSDTotal, amountInLvUSDToBorrow, SHARES);
            await validateCDP(NFT_ID_SECONDARY, nftIDSecondaryPrinciple, 0, nftIDSecondaryPrinciple, 0, SHARES);
        });

        it("Should not alter any NFT ID CDP if it tried to alter a non existing NFT", async function () {
            await expect(cdp.depositOUSDtoPosition(2349201840, amountInOUSDToDeposit)).to.be.revertedWith(
                "NFT ID must exist"
            );
            // Check that no other entry was changed
            await validateCDP(NFT_ID, nftIDMainPrinciple, 0, nftIDMainPrinciple, 0, SHARES);
            await validateCDP(NFT_ID_SECONDARY, nftIDSecondaryPrinciple, 0, nftIDSecondaryPrinciple, 0, SHARES);
        });
    });
});
