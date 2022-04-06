const { expect } = require("chai");
const exp = require("constants");
const { ethers } = require("hardhat");
const {
    BigNumber,
    FixedFormat,
    FixedNumber,
    formatFixed,
    parseFixed
} = require("@ethersproject/bignumber");

function getEighteenDecimal(naturalNumber) {
    return BigNumber.from(naturalNumber).mul(BigNumber.from('10000000000000000000'))
}

describe("CDPosition test suit", function () {

    async function validateCDP(nftID, principle, interestEarned, total, borrowed, firstCycle) {
        expect(await cdp.getOUSDPrinciple(nftID)).to.equal(principle);
        expect(await cdp.getOUSDInterestEarned(nftID)).to.equal(interestEarned);
        expect(await cdp.getOUSDTotal(nftID)).to.equal(total);
        expect(await cdp.getLvUSDBorrowed(nftID)).to.equal(borrowed);
        expect(await cdp.getFirstCycle(nftID)).to.equal(firstCycle);
    }

    let cdp;

    const NFT_ID_1 = 1234;
    const NFT_ID_2 = 67889;
    const BASIC_OUSD_PRINCIPLE = getEighteenDecimal(1000000)

    beforeEach(async function () {
        let contract = await ethers.getContractFactory("CDPosition");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        cdp
            = await contract.deploy();
    });

    describe("Create position", function () {
        it("Should create position", async function () {
            // create a new position
            await cdp.createPosition(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE)

            // validate CDP Values
            await validateCDP(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, 0, true)
        });
        it("Should not create position on existing address", async function () {
            // create a new position
            await cdp.createPosition(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE)
            // Try to create position again, expect to revert
            await expect(cdp.createPosition(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE)).to.be.revertedWith("NFT ID must not exist")
        })
    });

    describe("Delete Position", function () {
        it("Should delete position", async function () {
            await cdp.createPosition(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE)
            // validate CDP Values
            await validateCDP(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, 0, true)
            await cdp.deletePosition(NFT_ID_1)
            // expect validation to revert since key is missing in CDP
            await expect(validateCDP(NFT_ID_1
                , 0, 0, 0, 0, false)).to.be.revertedWith("NFT ID must exist")
        });
        it("Should not delete position if position still has borrowed lvUSD", async function () {
            await cdp.createPosition(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE)
            cdp.borrowLvUSDFromPosition(NFT_ID_1, getEighteenDecimal(100))
            await expect(cdp.deletePosition(NFT_ID_1)).to.be
                .revertedWith("Borrowed LvUSD must be zero before deleting")
        });
        it("Should not delete position if address does not exist in mapping", async function () {
            await expect(cdp.deletePosition(NFT_ID_1)).to.be.revertedWith("NFT ID must exist")
        });
    });

    describe("Borrow and deposit actions for position", function () {
        const LVUSD_AMOUNT = getEighteenDecimal(10000)

        beforeEach(async function () {
            // create a new position
            await cdp.createPosition(NFT_ID_1
                , BASIC_OUSD_PRINCIPLE)
        })
        it("Should mark up borrowed LvUSD from NFT position", async function () {
            await cdp.borrowLvUSDFromPosition(NFT_ID_1, LVUSD_AMOUNT)
            await validateCDP(NFT_ID_1, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, LVUSD_AMOUNT, true);
        })

        it("Should mark down repayed lvUSD from NFT position", async function () {
            await cdp.borrowLvUSDFromPosition(NFT_ID_1, LVUSD_AMOUNT)
            await cdp.repayLvUSDToPosition(NFT_ID_1, getEighteenDecimal(1000))
            await validateCDP(NFT_ID_1, BASIC_OUSD_PRINCIPLE, 0, BASIC_OUSD_PRINCIPLE, getEighteenDecimal(9000), true)
        })

        it("Should not mark down repayed lvUSD if not enough borrowed lvUSD", async function () {
            await expect(cdp.repayLvUSDToPosition(NFT_ID_1, getEighteenDecimal(1000)))
                .to.be.revertedWith("lvUSD Borrowed amount must be greater than amount to repay")
        })

    })
});