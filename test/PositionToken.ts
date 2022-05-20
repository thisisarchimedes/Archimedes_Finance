import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { PositionToken } from "../types/contracts";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("PositionToken test suit", function () {
    let r: ContractTestContext;
    let ptContract: ContractFactory;

    describe("Roles and initialization", async function () {
        before(async () => {
            r = await buildContractTestContext();
            ptContract = await ethers.getContractFactory("PositionToken");
        });

        it("Should be built properly by ContractTestContext", async function () {
            expect(r.positionToken).to.not.be.undefined;
        });

        it("Should not allow non admin to init", async function () {
            const addr1PositionToken = await ptContract.deploy(r.addr1.address) as PositionToken;
            const initPromise = addr1PositionToken.init(r.addr2.address);
            await expect(initPromise).to.be.revertedWith("onlyAdmin: Not admin");
        });

        it("Should not allow non executive to mint", async function () {
            await r.positionToken.init(r.addr1.address);
            const mintPromise = r.positionToken.safeMint(r.addr1.address);
            await expect(mintPromise).to.be.revertedWith("Caller is not executive");
        });
    });

    describe("After initialized with owner set to executive", async function () {
        const firstTokenId = 0;
        const secondTokenId = 1;
        const thirdTokenId = 2;
        let firstTokenOwner: SignerWithAddress;
        let firstTokenOwnerAddress: string;
        let secondTokenOwner: SignerWithAddress;
        let secondTokenOwnerAddress: string;
        let thirdTokenOwner: SignerWithAddress;
        let thirdTokenOwnerAddress: string;

        before(async function () {
            r = await buildContractTestContext();
            await r.positionToken.init(r.owner.address);
            firstTokenOwner = r.addr1;
            firstTokenOwnerAddress = r.addr1.address;
            secondTokenOwner = r.addr2;
            secondTokenOwnerAddress = r.addr2.address;
            thirdTokenOwner = r.addr3;
            thirdTokenOwnerAddress = r.addr3.address;
        });

        it("Should revert if the token id doesn't exist", async function () {
            await expect(r.positionToken.ownerOf(0)).to.be.reverted;
        });

        it("Should be mintable from address designated executive", async function () {
            await r.positionToken.safeMint(r.addr1.address);
            expect(await r.positionToken.ownerOf(firstTokenId)).to.equal(firstTokenOwnerAddress);
        });

        it("Should increment the positionTokenId properly", async function () {
            await r.positionToken.safeMint(r.addr2.address);
            expect(await r.positionToken.ownerOf(secondTokenId)).to.equal(secondTokenOwnerAddress);
        });

        it("Should fail to burn if not executive", async function () {
            const burnPromise = r.positionToken.connect(secondTokenOwner).burn(firstTokenId);
            await expect(burnPromise).to.be.revertedWith("Caller is not executive");
        });

        it("Should not allow positionToken owner to burn positionToken directly. Position unwind required via executive", async function () {
            const burnPromise = r.positionToken.connect(firstTokenOwner).burn(firstTokenId);
            await expect(burnPromise).to.be.revertedWith("Caller is not executive");
        });

        it("Should allow executive to burn any token", async function () {
            await r.positionToken.burn(firstTokenId);
            await r.positionToken.burn(secondTokenId);
            expect(await r.positionToken.exists(firstTokenId)).to.be.false;
            expect(await r.positionToken.exists(secondTokenId)).to.be.false;
        });

        it("Should continue to increment id properly after tokens have been burned", async function () {
            await r.positionToken.safeMint(r.addr3.address);
            expect(await r.positionToken.ownerOf(thirdTokenId)).to.equal(thirdTokenOwnerAddress);
        });

        it("Should allow positionToken owner to transfer ownership", async function () {
            const safeTransferAsThirdOwner = r.positionToken.connect(thirdTokenOwner)["safeTransferFrom(address,address,uint256)"];
            await safeTransferAsThirdOwner(
                thirdTokenOwnerAddress,
                secondTokenOwnerAddress,
                thirdTokenId,
            );
            expect(await r.positionToken.ownerOf(thirdTokenId)).to.equal(secondTokenOwnerAddress);
        });

        it("Should not allow non owner to transfer positionToken", async function () {
            const safeTransferAsThirdOwner = r.positionToken.connect(thirdTokenOwner)["safeTransferFrom(address,address,uint256)"];
            /* thirdTokenOwner no longer owner of thirdTokenId, should no longer be able to transfer: */
            await expect(
                safeTransferAsThirdOwner(
                    secondTokenOwnerAddress,
                    thirdTokenOwnerAddress,
                    thirdTokenId,
                ),
            ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        });
    });
});
