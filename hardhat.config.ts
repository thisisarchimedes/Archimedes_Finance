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
            accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"],
            gas: 3000000,
            allowUnlimitedContractSize: true,
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
