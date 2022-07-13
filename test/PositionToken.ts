import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";

describe("PositionToken test suit", function () {
    let r: ContractTestContext;
    const firstTokenId = 0;
    const secondTokenId = 1;
    const thirdTokenId = 2;
    let firstTokenOwner: SignerWithAddress;
    let firstTokenOwnerAddress: string;
    let secondTokenOwner: SignerWithAddress;
    let secondTokenOwnerAddress: string;
    let thirdTokenOwner: SignerWithAddress;
    let thirdTokenOwnerAddress: string;

    let executiveSigner: SignerWithAddress;

    before(async function () {
        r = await buildContractTestContext();
        firstTokenOwner = r.addr1;
        firstTokenOwnerAddress = r.addr1.address;
        secondTokenOwner = r.addr2;
        secondTokenOwnerAddress = r.addr2.address;
        thirdTokenOwner = r.owner;
        thirdTokenOwnerAddress = r.owner.address;
        executiveSigner = r.addr3;

        await r.positionToken.setExecutive(executiveSigner.address);
    });

    it("Should not allow non executive to mint", async function () {
        const mintPromise = r.positionToken.connect(firstTokenOwner).safeMint(r.addr1.address);
        await expect(mintPromise).to.be.revertedWith("Caller is not Executive");
    });

    it("Should revert if the token id doesn't exist", async function () {
        await expect(r.positionToken.ownerOf(0)).to.be.reverted;
    });

    it("Should be mintable from address designated executive", async function () {
        await r.positionToken.connect(executiveSigner).safeMint(r.addr1.address);
        expect(await r.positionToken.connect(executiveSigner).ownerOf(firstTokenId)).to.equal(firstTokenOwnerAddress);
    });

    it("Should increment the positionTokenId properly", async function () {
        await r.positionToken.connect(executiveSigner).safeMint(r.addr2.address);
        expect(await r.positionToken.connect(executiveSigner).ownerOf(secondTokenId)).to.equal(secondTokenOwnerAddress);
    });

    it("Should fail to burn if not executive", async function () {
        const burnPromise = r.positionToken.connect(secondTokenOwner).burn(firstTokenId);
        await expect(burnPromise).to.be.revertedWith("Caller is not Executive");
    });

    it("Should not allow positionToken owner to burn positionToken directly. Position unwind required via executive", async function () {
        const burnPromise = r.positionToken.connect(firstTokenOwner).burn(firstTokenId);
        await expect(burnPromise).to.be.revertedWith("Caller is not Executive");
    });

    it("Should allow executive to burn any token", async function () {
        await r.positionToken.connect(executiveSigner).burn(firstTokenId);
        await r.positionToken.connect(executiveSigner).burn(secondTokenId);
        expect(await r.positionToken.connect(executiveSigner).exists(firstTokenId)).to.be.false;
        expect(await r.positionToken.connect(executiveSigner).exists(secondTokenId)).to.be.false;
    });

    it("Should continue to increment id properly after tokens have been burned", async function () {
        await r.positionToken.connect(executiveSigner).safeMint(thirdTokenOwnerAddress);
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
        /* thirdTokenOwner no longer owner of thirdTokenId, should not be able to transfer: */
        await expect(
            safeTransferAsThirdOwner(
                secondTokenOwnerAddress,
                thirdTokenOwnerAddress,
                thirdTokenId,
            ),
        ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
    });
});
