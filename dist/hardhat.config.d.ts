import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-watcher";
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
declare const _default: {
    solidity: {
        version: string;
        settings: {
            optimizer: {
                enabled: boolean;
                runs: number;
            };
        };
    };
    networks: {
        persistant: {
            url: string;
            accounts: string[];
            allowUnlimitedContractSize: boolean;
        };
        goerli: {
            url: string;
            accounts: string[];
        };
        hardhat: {
            chainId: number;
            forking: {
                url: string;
                allowUnlimitedContractSize: boolean;
                blockNumber: number;
            };
            localhost: {
                url: string;
                blockNumber: number;
                allowUnlimitedContractSize: boolean;
            };
        };
    };
    typechain: {
        outDir: string;
        target: string;
        alwaysGenerateOverloads: boolean;
        externalArtifacts: string[];
    };
    watcher: {
        test: {
            tasks: {
                command: string;
                params: {
                    path: string;
                };
            }[];
            files: string[];
            verbose: boolean;
        };
    };
    mocha: {
        timeout: number;
    };
    tenderly: {
        username: string;
        project: string;
    };
};
export default _default;
