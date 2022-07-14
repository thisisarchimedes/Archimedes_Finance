import hre, { ethers } from "hardhat";
import { Contract } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { abilvUSD, abiArchToken, abilvUSD3CRVPool, abiUSDC, abiZap } from "../test/ABIs";
import {
    addressOUSD, abiOUSDToken,
    addressUSDT, abiUSDTToken,
    address3CRV, abi3CRVToken,
    addressCurveOUSDPool,
    helperSwapETHWith3CRV,
    helperResetNetwork,
    defaultBlockNumber,
} from "../test/MainnetHelper";
import {
    addressArchToken, addressTreasury,
    impersonateAccount, fundAccount, stopImpersonate, addresslvUSDToken,
} from "../integrationTests/IntegrationTestContext";

export const signers = ethers.getSigners();

const About4700ETH = "0x1000000000000000000";

const addresslvUSDMinter = "0x42208d094776c533ee96a4a57d50a6ac04af4aa2";
const addresslvUSDAdmin = "0x7246dd11320eee513cefe5f50e8be2d28fb06426";

const fundLVUSD = async () => {
    const amount = "10000";
    const [owner, addr1, addr2, treasurySigner, addr3] = await signers;

    // grab lvUSD token contract
    const contractlvUSDToken = await ethers.getContractAt(abilvUSD, addresslvUSDToken);

    // grab lvUSD admin address
    const signerlvUSDAdmin = await impersonateAccount(addresslvUSDAdmin);
    fundAccount(addresslvUSDAdmin, About4700ETH);

    // grab lvUSD minter address
    const signerlvUSDMinter = await impersonateAccount(addresslvUSDMinter);
    fundAccount(addresslvUSDMinter, About4700ETH);

    await contractlvUSDToken.connect(signerlvUSDAdmin).setMintDestination(owner.address);
    await contractlvUSDToken.connect(signerlvUSDMinter).mint(ethers.utils.parseUnits(amount, 18));

    console.log(truncateEthAddress(owner.address) + " funded with " + amount + " LVUSD");
};

const fundARCH = async () => {
    const amount = "10000";
    const [owner, addr1, addr2, treasurySigner, addr3] = await signers;

    const contractArchToken = await ethers.getContractAt(abiArchToken, addressArchToken);
    // treasury owns all ARCH
    const signerTreasury = await impersonateAccount(addressTreasury);
    fundAccount(addressTreasury, About4700ETH);

    await contractArchToken.connect(signerTreasury).transfer(owner.address, ethers.utils.parseUnits(amount, 18));

    console.log(truncateEthAddress(owner.address) + " funded with " + amount + " ARCH");
};

const cleanup = async () => {
    await stopImpersonate(addresslvUSDMinter);
    await stopImpersonate(addresslvUSDAdmin);
};

const truncateEthAddress = (address: string) => {
    const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;
    const match = address.match(truncateRegex);
    if (!match) return address;
    return `${match[1]}…${match[2]}`;
};

const deployScript = async () => {
    await fundLVUSD();
    await fundARCH();
    await cleanup();
};

deployScript();
