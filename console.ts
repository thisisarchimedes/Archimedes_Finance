#!/usr/bin/env ts-node
import repl from "repl";
/* direct references to hardhat properties only work with require in this file: */
const hardhat = require("hardhat"); /* eslint-disable-line @typescript-eslint/no-var-requires */

const replServer = repl.start({
    prompt: "> ",
});

replServer.context.hardhat = hardhat;
replServer.context.ethers = hardhat.ethers;
