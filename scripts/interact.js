/* eslint-disable @typescript-eslint/no-var-requires */
const { abiLvUSDToken } = require("../test/ABIs.ts");
const { ethers } = require("hardhat");
async function main () {
    /*  ========  Access existing contract ========= */
    const ownerAddress = "0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F";
    const rinkebyLvUSDAddress = "0x0b163730c49e32A01f1E54779df03349A59E4c4E";
    const rinkebyURL = "alchemyapi rinkeby URL";
    const walletPrivateKey = "your private key";
    const provider = new ethers.providers.JsonRpcProvider(rinkebyURL);

    const signer = new ethers.Wallet(walletPrivateKey, provider);

    const lvUSD = new ethers.Contract(rinkebyLvUSDAddress, abiLvUSDToken, signer);

    await lvUSD.mint(ethers.utils.parseEther("101.0"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
