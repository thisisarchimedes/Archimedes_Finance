import "@tenderly/hardhat-tenderly";

// typechain imports:
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import "@openzeppelin/hardhat-upgrades";

import "hardhat-watcher";

import { setLoggingEnabled } from "./logger";
import { task, types } from "hardhat/config";
import dotenv from "dotenv";
import { resolve } from "path";

require("@nomiclabs/hardhat-ethers");

// grab the private api key from the private repo
dotenv.config({ path: "secrets/alchemy.env" });
dotenv.config({ path: resolve(__dirname, "./user.env") });

const alchemyUrl = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;
// Notice that if no process.env.PRIVATE_WALLET_KEY, set it a random value (junk key)
const georliPrivateKey = process.env.PRIVATE_WALLET_KEY || "3d5840424a343a01a9eb7c4e4cce2b9675562910de9e68292c6f4266b40b78b3";
const goerliURL = process.env.GOERLI_ALCHEMY_URL;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task("test:watch", "For hardhat watch to run tests on save for both test and sol files", async (taskArgs: { path: string }, hre) => {
    /* testFiles is always an array of one file: */
    let { path } = taskArgs;
    if (path.match(/\.sol$/)) {
        path = path.replace(/^contracts\/([^.]+).sol$/, "test/$1.ts");
        console.log(`Running matching test ${path} for changed Solidity file ${taskArgs.path}`);
    }
    await hre.run("test:log", { file: path });
});

task("test:log", "Run tests with all logger logs", async (taskArgs: { file }, hre) => {
    const { file } = taskArgs;
    setLoggingEnabled(true);
    const args = file ? { testFiles: [file] } : undefined;
    await hre.run("test", args);
}).addOptionalParam("file", "If provided run tests only on specified file", undefined, types.inputFile);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
    solidity: {
        version: "0.8.13",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        persistant: {
            url: "http://ec2-54-211-119-50.compute-1.amazonaws.com:8545",
            accounts: ["0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897", 
            "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82", 
            "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1", 
            "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd"],
        },
        goerli: {
            url: `${goerliURL}`,
            accounts: [`0x${georliPrivateKey}`],

        },
        hardhat: {
            chainId: 1337,
            forking: {
                url: alchemyUrl,
                allowUnlimitedContractSize: true,
                gas: 3000000,
            },
            localhost: {
                url: "http://127.0.0.1:8545",
                gas: 3000000,
                allowUnlimitedContractSize: true,
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
    watcher: {
        test: {
            tasks: [{ command: "test:watch", params: { path: "{path}" } }],
            files: ["./test/**/*", "./contracts/**/*"],
            verbose: true,
        },
    },
    mocha: {
        timeout: 100000000,
    },
};
