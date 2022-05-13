import "@tenderly/hardhat-tenderly";

// typechain imports:
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import { task } from "hardhat/config";
import dotenv from "dotenv";

// grab the private api key from the private repo
dotenv.config({ path: "secrets/alchemy.env" });

const alchemyUrl = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;

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
export default {
    solidity: "0.8.13",
    networks: {
        hardhat: {
            forking: {
                url: alchemyUrl,
                blockNumber: 14533286,
            },
            localhost: {
                url: "http://127.0.0.1:8545",
            },
        },
    },
    typechain: {
        outDir: "types",
        target: "ethers-v5",
        // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
        alwaysGenerateOverloads: false,
        // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
        externalArtifacts: ["externalArtifacts/*.json"],
    },
};
