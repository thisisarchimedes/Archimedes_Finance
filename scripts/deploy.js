const { ethers, upgrades } = require("hardhat");

async function main () {
    const [owner, user1] = await ethers.getSigners();

    // We get the contract to deploy

    const LvUSDToken = await ethers.getContractFactory("LvUSDToken");
    const lvUsdToken = await LvUSDToken.deploy("0x68d1Ca347b77617e1Ad4ab3Cf8c6F299B2c9813F");

    await lvUsdToken.deployed();

    console.log("LvUSDToken deployed to:", lvUsdToken.address);
    // await lvUsdToken.setMinter(owner.address);
    // await lvUsdToken.mint(owner.address, ethers.utils.parseEther("100.0"));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
