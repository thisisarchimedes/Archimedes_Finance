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
            accounts: [
                "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
                "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
                "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
                "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
                "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
                "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
                "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
                "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
                "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
                "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
                "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
                "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82", // OG 1
                "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1", // OG 2
                "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd", // OG 3
                "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa", // OG 4
                "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61", // OG 5
                "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0", // OG 6
                "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd", // OG 7
                "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0", // OG 8
                "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
            ],
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
                allowUnlimitedContractSize: false,
                blockNumber: 15104872,
            },

            localhost: {
                url: "http://127.0.0.1:8545",
                blockNumber: 15104872,
                allowUnlimitedContractSize: false,
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
