require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-contract-sizer");
require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-vyper");

// grab the private api key from the private repo
require("dotenv").config({ path: "secrets/alchemy.env" });
let alchemy_url =
    "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

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
    solidity: {
        compilers: [
            { version: "0.8.9" },
            { version: "0.8.4" },
            { version: "0.8.0" },
            { version: "0.5.16" },
            { version: "0.6.6" },
            { version: "0.4.18" },
            { version: "0.7.4" },
            { version: "0.5.12" },
            { version: "0.6.12" },
            { version: "0.6.0" },
            { version: "0.5.17" },
        ],
        settings: {
            optimizer: {
                enabled: true,
                runs: 1,
            },
        },
    },
    vyper: {
        compilers: [
            { version: "0.3.1" },
            { version: "0.2.8" },
            { version: "0.2.5" },
            { version: "0.2.4" },
            { version: "0.3.0" },
            { version: "0.2.15" },
        ],
    },
    networks: {
        hardhat: {
            forking: {
                enabled: true,
                url: alchemy_url,
                blockNumber: 14533286,
                blockGasLimit: 1000000004297200000,
                allowUnlimitedContractSize: true,
            },
            localhost: {
              url: "http://127.0.0.1:8545"
            },
            allowUnlimitedContractSize: true,
        },
    },
    mocha: {
        timeout: 100000000,
    },
};
