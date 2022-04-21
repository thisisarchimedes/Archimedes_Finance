require("@nomiclabs/hardhat-waffle");

// grab the private api key from the private repo
require('dotenv').config({ path: 'secrets/alchemy.env' })
let alchemy_url = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.13",

  networks: {
    hardhat: {
      forking: {
        url: alchemy_url,
        blockNumber: 14533286
      }
    }
  }
};
