/* eslint-disable @typescript-eslint/no-var-requires */
const { ethers } = require("hardhat");
async function main () {
    /*  ========  Access existing contract ========= */
    const ownerAddress = "0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F";
    const rinkebyLvUSDAddress = "0x0b163730c49e32A01f1E54779df03349A59E4c4E";
    const rinkebyURL = "https://eth-rinkeby.alchemyapi.io/v2/2v4erqi9uYXc9ipR4g4DdoSdr5zG1CpL";
    const walletPrivateKey = "08d97e512dbf53f8b736ec399da4bb0baef5e81cffc47f85227e9e92fe1c6d9d";
    const provider = new ethers.providers.JsonRpcProvider(rinkebyURL);

    const signer = new ethers.Wallet(walletPrivateKey, provider);

    const lvUSD = new ethers.Contract(rinkebyLvUSDAddress, abiLvUSDToken, signer);

    await lvUSD.mint(ownerAddress, ethers.utils.parseEther("101.0"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
