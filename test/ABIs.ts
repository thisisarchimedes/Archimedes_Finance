/* eslint-disable max-len */

/* Archimedes ABIs */
const abilvUSD = [{ inputs: [{ internalType: "address", name: "admin", type: "address" }], stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: true, internalType: "address", name: "spender", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Approval", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "role", type: "bytes32" }, { indexed: true, internalType: "bytes32", name: "previousAdminRole", type: "bytes32" }, { indexed: true, internalType: "bytes32", name: "newAdminRole", type: "bytes32" }], name: "RoleAdminChanged", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "role", type: "bytes32" }, { indexed: true, internalType: "address", name: "account", type: "address" }, { indexed: true, internalType: "address", name: "sender", type: "address" }], name: "RoleGranted", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "role", type: "bytes32" }, { indexed: true, internalType: "address", name: "account", type: "address" }, { indexed: true, internalType: "address", name: "sender", type: "address" }], name: "RoleRevoked", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "from", type: "address" }, { indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Transfer", type: "event" }, { inputs: [], name: "ADMIN_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" }, { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" }, { inputs: [], name: "MINTER_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "subtractedValue", type: "uint256" }], name: "decreaseAllowance", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }], name: "getRoleAdmin", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "hasRole", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "addedValue", type: "uint256" }], name: "increaseAllowance", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "renounceRole", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "newAdmin", type: "address" }], name: "setAdmin", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "mintDestination", type: "address" }], name: "setMintDestination", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "newMinter", type: "address" }], name: "setMinter", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }], name: "supportsInterface", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }, { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" }, { inputs: [], name: "totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "transfer", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "transferFrom", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }];

const abiArchToken = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_addressTreasury",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "delegator",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "fromDelegate",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "toDelegate",
                type: "address",
            },
        ],
        name: "DelegateChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "delegate",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "previousBalance",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newBalance",
                type: "uint256",
            },
        ],
        name: "DelegateVotesChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "approve",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint32",
                name: "pos",
                type: "uint32",
            },
        ],
        name: "checkpoints",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint32",
                        name: "fromBlock",
                        type: "uint32",
                    },
                    {
                        internalType: "uint224",
                        name: "votes",
                        type: "uint224",
                    },
                ],
                internalType: "struct ERC20Votes.Checkpoint",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "subtractedValue",
                type: "uint256",
            },
        ],
        name: "decreaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "delegatee",
                type: "address",
            },
        ],
        name: "delegate",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "delegatee",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "nonce",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "expiry",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "delegateBySig",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "delegates",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256",
            },
        ],
        name: "getPastTotalSupply",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256",
            },
        ],
        name: "getPastVotes",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "getVotes",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "addedValue",
                type: "uint256",
            },
        ],
        name: "increaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "nonces",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "numCheckpoints",
        outputs: [
            {
                internalType: "uint32",
                name: "",
                type: "uint32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transfer",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transferFrom",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];

/* ABIs */
const abiOUSDToken = [{ anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: true, internalType: "address", name: "spender", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Approval", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousGovernor", type: "address" }, { indexed: true, internalType: "address", name: "newGovernor", type: "address" }], name: "GovernorshipTransferred", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousGovernor", type: "address" }, { indexed: true, internalType: "address", name: "newGovernor", type: "address" }], name: "PendingGovernorshipTransfer", type: "event" }, { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "totalSupply", type: "uint256" }, { indexed: false, internalType: "uint256", name: "rebasingCredits", type: "uint256" }, { indexed: false, internalType: "uint256", name: "rebasingCreditsPerToken", type: "uint256" }], name: "TotalSupplyUpdatedHighres", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "from", type: "address" }, { indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: false, internalType: "uint256", name: "value", type: "uint256" }], name: "Transfer", type: "event" }, { inputs: [], name: "_totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_owner", type: "address" }, { internalType: "address", name: "_spender", type: "address" }], name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_spender", type: "address" }, { internalType: "uint256", name: "_value", type: "uint256" }], name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "_account", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "account", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "burn", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "uint256", name: "_newTotalSupply", type: "uint256" }], name: "changeSupply", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "claimGovernance", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "_account", type: "address" }], name: "creditsBalanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_account", type: "address" }], name: "creditsBalanceOfHighres", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }, { inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_spender", type: "address" }, { internalType: "uint256", name: "_subtractedValue", type: "uint256" }], name: "decreaseAllowance", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "governor", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_spender", type: "address" }, { internalType: "uint256", name: "_addedValue", type: "uint256" }], name: "increaseAllowance", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "string", name: "_nameArg", type: "string" }, { internalType: "string", name: "_symbolArg", type: "string" }, { internalType: "address", name: "_vaultAddress", type: "address" }], name: "initialize", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "isGovernor", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "", type: "address" }], name: "isUpgraded", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_account", type: "address" }, { internalType: "uint256", name: "_amount", type: "uint256" }], name: "mint", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "", type: "address" }], name: "nonRebasingCreditsPerToken", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "nonRebasingSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "rebaseOptIn", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "rebaseOptOut", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "", type: "address" }], name: "rebaseState", outputs: [{ internalType: "enum OUSD.RebaseOptions", name: "", type: "uint8" }], stateMutability: "view", type: "function" }, { inputs: [], name: "rebasingCredits", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "rebasingCreditsHighres", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "rebasingCreditsPerToken", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "rebasingCreditsPerTokenHighres", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" }, { inputs: [], name: "totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ internalType: "address", name: "_to", type: "address" }, { internalType: "uint256", name: "_value", type: "uint256" }], name: "transfer", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "_from", type: "address" }, { internalType: "address", name: "_to", type: "address" }, { internalType: "uint256", name: "_value", type: "uint256" }], name: "transferFrom", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ internalType: "address", name: "_newGovernor", type: "address" }], name: "transferGovernance", outputs: [], stateMutability: "nonpayable", type: "function" }, { inputs: [], name: "vaultAddress", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" }];
const abiCurveOUSDPool = [{ name: "Transfer", inputs: [{ type: "address", name: "sender", indexed: true }, { type: "address", name: "receiver", indexed: true }, { type: "uint256", name: "value", indexed: false }], anonymous: false, type: "event" }, { name: "Approval", inputs: [{ type: "address", name: "owner", indexed: true }, { type: "address", name: "spender", indexed: true }, { type: "uint256", name: "value", indexed: false }], anonymous: false, type: "event" }, { name: "TokenExchange", inputs: [{ type: "address", name: "buyer", indexed: true }, { type: "int128", name: "sold_id", indexed: false }, { type: "uint256", name: "tokens_sold", indexed: false }, { type: "int128", name: "bought_id", indexed: false }, { type: "uint256", name: "tokens_bought", indexed: false }], anonymous: false, type: "event" }, { name: "TokenExchangeUnderlying", inputs: [{ type: "address", name: "buyer", indexed: true }, { type: "int128", name: "sold_id", indexed: false }, { type: "uint256", name: "tokens_sold", indexed: false }, { type: "int128", name: "bought_id", indexed: false }, { type: "uint256", name: "tokens_bought", indexed: false }], anonymous: false, type: "event" }, { name: "AddLiquidity", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[2]", name: "token_amounts", indexed: false }, { type: "uint256[2]", name: "fees", indexed: false }, { type: "uint256", name: "invariant", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidity", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[2]", name: "token_amounts", indexed: false }, { type: "uint256[2]", name: "fees", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidityOne", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256", name: "token_amount", indexed: false }, { type: "uint256", name: "coin_amount", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidityImbalance", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[2]", name: "token_amounts", indexed: false }, { type: "uint256[2]", name: "fees", indexed: false }, { type: "uint256", name: "invariant", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "CommitNewAdmin", inputs: [{ type: "uint256", name: "deadline", indexed: true }, { type: "address", name: "admin", indexed: true }], anonymous: false, type: "event" }, { name: "NewAdmin", inputs: [{ type: "address", name: "admin", indexed: true }], anonymous: false, type: "event" }, { name: "CommitNewFee", inputs: [{ type: "uint256", name: "deadline", indexed: true }, { type: "uint256", name: "fee", indexed: false }, { type: "uint256", name: "admin_fee", indexed: false }], anonymous: false, type: "event" }, { name: "NewFee", inputs: [{ type: "uint256", name: "fee", indexed: false }, { type: "uint256", name: "admin_fee", indexed: false }], anonymous: false, type: "event" }, { name: "RampA", inputs: [{ type: "uint256", name: "old_A", indexed: false }, { type: "uint256", name: "new_A", indexed: false }, { type: "uint256", name: "initial_time", indexed: false }, { type: "uint256", name: "future_time", indexed: false }], anonymous: false, type: "event" }, { name: "StopRampA", inputs: [{ type: "uint256", name: "A", indexed: false }, { type: "uint256", name: "t", indexed: false }], anonymous: false, type: "event" }, { outputs: [], inputs: [], stateMutability: "nonpayable", type: "constructor" }, { name: "initialize", outputs: [], inputs: [{ type: "string", name: "_name" }, { type: "string", name: "_symbol" }, { type: "address", name: "_coin" }, { type: "uint256", name: "_decimals" }, { type: "uint256", name: "_A" }, { type: "uint256", name: "_fee" }, { type: "address", name: "_admin" }], stateMutability: "nonpayable", type: "function", gas: 470049 }, { name: "decimals", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 291 }, { name: "transfer", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 75402 }, { name: "transferFrom", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_from" }, { type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 112037 }, { name: "approve", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_spender" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 37854 }, { name: "get_previous_balances", outputs: [{ type: "uint256[2]", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2254 }, { name: "get_balances", outputs: [{ type: "uint256[2]", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2284 }, { name: "get_twap_balances", outputs: [{ type: "uint256[2]", name: "" }], inputs: [{ type: "uint256[2]", name: "_first_balances" }, { type: "uint256[2]", name: "_last_balances" }, { type: "uint256", name: "_time_elapsed" }], stateMutability: "view", type: "function", gas: 1522 }, { name: "get_price_cumulative_last", outputs: [{ type: "uint256[2]", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2344 }, { name: "admin_fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 621 }, { name: "A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 5859 }, { name: "A_precise", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 5821 }, { name: "get_virtual_price", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 1011891 }, { name: "calc_token_amount", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "bool", name: "_is_deposit" }], stateMutability: "view", type: "function" }, { name: "calc_token_amount", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "bool", name: "_is_deposit" }, { type: "bool", name: "_previous" }], stateMutability: "view", type: "function" }, { name: "add_liquidity", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_min_mint_amount" }], stateMutability: "nonpayable", type: "function" }, { name: "add_liquidity", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_min_mint_amount" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "get_dy", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }], stateMutability: "view", type: "function" }, { name: "get_dy", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256[2]", name: "_balances" }], stateMutability: "view", type: "function" }, { name: "get_dy_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }], stateMutability: "view", type: "function" }, { name: "get_dy_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256[2]", name: "_balances" }], stateMutability: "view", type: "function" }, { name: "exchange", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }], stateMutability: "nonpayable", type: "function" }, { name: "exchange1", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "exchange_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }], stateMutability: "nonpayable", type: "function" }, { name: "exchange_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity", outputs: [{ type: "uint256[2]", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "uint256[2]", name: "_min_amounts" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity", outputs: [{ type: "uint256[2]", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "uint256[2]", name: "_min_amounts" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity_imbalance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_max_burn_amount" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity_imbalance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_max_burn_amount" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "calc_withdraw_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }], stateMutability: "view", type: "function" }, { name: "calc_withdraw_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }, { type: "bool", name: "_previous" }], stateMutability: "view", type: "function" }, { name: "remove_liquidity_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }, { type: "uint256", name: "_min_received" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }, { type: "uint256", name: "_min_received" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "ramp_A", outputs: [], inputs: [{ type: "uint256", name: "_future_A" }, { type: "uint256", name: "_future_time" }], stateMutability: "nonpayable", type: "function", gas: 152464 }, { name: "stop_ramp_A", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 149225 }, { name: "admin_balances", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "i" }], stateMutability: "view", type: "function", gas: 3601 }, { name: "withdraw_admin_fees", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 11347 }, { name: "admin", outputs: [{ type: "address", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2141 }, { name: "coins", outputs: [{ type: "address", name: "" }], inputs: [{ type: "uint256", name: "arg0" }], stateMutability: "view", type: "function", gas: 2280 }, { name: "balances", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "arg0" }], stateMutability: "view", type: "function", gas: 2310 }, { name: "fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2231 }, { name: "block_timestamp_last", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2261 }, { name: "initial_A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2291 }, { name: "future_A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2321 }, { name: "initial_A_time", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2351 }, { name: "future_A_time", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2381 }, { name: "name", outputs: [{ type: "string", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 8813 }, { name: "symbol", outputs: [{ type: "string", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 7866 }, { name: "balanceOf", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "address", name: "arg0" }], stateMutability: "view", type: "function", gas: 2686 }, { name: "allowance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "address", name: "arg0" }, { type: "address", name: "arg1" }], stateMutability: "view", type: "function", gas: 2931 }, { name: "totalSupply", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2531 }];
const abiCurveTripool2 = [{ anonymous: false, inputs: [{ indexed: true, name: "buyer", type: "address" }, { indexed: false, name: "sold_id", type: "uint256" }, { indexed: false, name: "tokens_sold", type: "uint256" }, { indexed: false, name: "bought_id", type: "uint256" }, { indexed: false, name: "tokens_bought", type: "uint256" }], name: "TokenExchange", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "provider", type: "address" }, { indexed: false, name: "token_amounts", type: "uint256[3]" }, { indexed: false, name: "fee", type: "uint256" }, { indexed: false, name: "token_supply", type: "uint256" }], name: "AddLiquidity", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "provider", type: "address" }, { indexed: false, name: "token_amounts", type: "uint256[3]" }, { indexed: false, name: "token_supply", type: "uint256" }], name: "RemoveLiquidity", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "provider", type: "address" }, { indexed: false, name: "token_amount", type: "uint256" }, { indexed: false, name: "coin_index", type: "uint256" }, { indexed: false, name: "coin_amount", type: "uint256" }], name: "RemoveLiquidityOne", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "deadline", type: "uint256" }, { indexed: true, name: "admin", type: "address" }], name: "CommitNewAdmin", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "admin", type: "address" }], name: "NewAdmin", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "deadline", type: "uint256" }, { indexed: false, name: "admin_fee", type: "uint256" }, { indexed: false, name: "mid_fee", type: "uint256" }, { indexed: false, name: "out_fee", type: "uint256" }, { indexed: false, name: "fee_gamma", type: "uint256" }, { indexed: false, name: "allowed_extra_profit", type: "uint256" }, { indexed: false, name: "adjustment_step", type: "uint256" }, { indexed: false, name: "ma_half_time", type: "uint256" }], name: "CommitNewParameters", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "admin_fee", type: "uint256" }, { indexed: false, name: "mid_fee", type: "uint256" }, { indexed: false, name: "out_fee", type: "uint256" }, { indexed: false, name: "fee_gamma", type: "uint256" }, { indexed: false, name: "allowed_extra_profit", type: "uint256" }, { indexed: false, name: "adjustment_step", type: "uint256" }, { indexed: false, name: "ma_half_time", type: "uint256" }], name: "NewParameters", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "initial_A", type: "uint256" }, { indexed: false, name: "future_A", type: "uint256" }, { indexed: false, name: "initial_gamma", type: "uint256" }, { indexed: false, name: "future_gamma", type: "uint256" }, { indexed: false, name: "initial_time", type: "uint256" }, { indexed: false, name: "future_time", type: "uint256" }], name: "RampAgamma", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "current_A", type: "uint256" }, { indexed: false, name: "current_gamma", type: "uint256" }, { indexed: false, name: "time", type: "uint256" }], name: "StopRampA", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "admin", type: "address" }, { indexed: false, name: "tokens", type: "uint256" }], name: "ClaimAdminFee", type: "event" }, { inputs: [{ name: "owner", type: "address" }, { name: "admin_fee_receiver", type: "address" }, { name: "A", type: "uint256" }, { name: "gamma", type: "uint256" }, { name: "mid_fee", type: "uint256" }, { name: "out_fee", type: "uint256" }, { name: "allowed_extra_profit", type: "uint256" }, { name: "fee_gamma", type: "uint256" }, { name: "adjustment_step", type: "uint256" }, { name: "admin_fee", type: "uint256" }, { name: "ma_half_time", type: "uint256" }, { name: "initial_prices", type: "uint256[2]" }], outputs: [], stateMutability: "nonpayable", type: "constructor" }, { stateMutability: "payable", type: "fallback" }, { gas: 3361, inputs: [{ name: "k", type: "uint256" }], name: "price_oracle", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3391, inputs: [{ name: "k", type: "uint256" }], name: "price_scale", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3421, inputs: [{ name: "k", type: "uint256" }], name: "last_prices", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 468, inputs: [], name: "token", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 582, inputs: [{ name: "i", type: "uint256" }], name: "coins", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 597, inputs: [], name: "A", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 11991, inputs: [], name: "gamma", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 21673, inputs: [], name: "fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 11096, inputs: [{ name: "xp", type: "uint256[3]" }], name: "fee_calc", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 11582, inputs: [], name: "get_virtual_price", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { inputs: [{ name: "i", type: "uint256" }, { name: "j", type: "uint256" }, { name: "dx", type: "uint256" }, { name: "min_dy", type: "uint256" }], name: "exchange", outputs: [], stateMutability: "payable", type: "function" }, { inputs: [{ name: "i", type: "uint256" }, { name: "j", type: "uint256" }, { name: "dx", type: "uint256" }, { name: "min_dy", type: "uint256" }, { name: "use_eth", type: "bool" }], name: "exchange1", outputs: [], stateMutability: "payable", type: "function" }, { gas: 3122, inputs: [{ name: "i", type: "uint256" }, { name: "j", type: "uint256" }, { name: "dx", type: "uint256" }], name: "get_dy", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 26582, inputs: [{ name: "amounts", type: "uint256[3]" }, { name: "xp", type: "uint256[3]" }], name: "calc_token_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 738687, inputs: [{ name: "amounts", type: "uint256[3]" }, { name: "min_mint_amount", type: "uint256" }], name: "add_liquidity", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 233981, inputs: [{ name: "_amount", type: "uint256" }, { name: "min_amounts", type: "uint256[3]" }], name: "remove_liquidity", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 3429, inputs: [{ name: "amounts", type: "uint256[3]" }, { name: "deposit", type: "bool" }], name: "calc_token_amount", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 13432, inputs: [{ name: "token_amount", type: "uint256" }, { name: "i", type: "uint256" }], name: "calc_withdraw_one_coin", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 648579, inputs: [{ name: "token_amount", type: "uint256" }, { name: "i", type: "uint256" }, { name: "min_amount", type: "uint256" }], name: "remove_liquidity_one_coin", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 389808, inputs: [], name: "claim_admin_fees", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 163102, inputs: [{ name: "future_A", type: "uint256" }, { name: "future_gamma", type: "uint256" }, { name: "future_time", type: "uint256" }], name: "ramp_A_gamma", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 157247, inputs: [], name: "stop_ramp_A_gamma", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 306190, inputs: [{ name: "_new_mid_fee", type: "uint256" }, { name: "_new_out_fee", type: "uint256" }, { name: "_new_admin_fee", type: "uint256" }, { name: "_new_fee_gamma", type: "uint256" }, { name: "_new_allowed_extra_profit", type: "uint256" }, { name: "_new_adjustment_step", type: "uint256" }, { name: "_new_ma_half_time", type: "uint256" }], name: "commit_new_parameters", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 683438, inputs: [], name: "apply_new_parameters", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 23222, inputs: [], name: "revert_new_parameters", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 77260, inputs: [{ name: "_owner", type: "address" }], name: "commit_transfer_ownership", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 65937, inputs: [], name: "apply_transfer_ownership", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 23312, inputs: [], name: "revert_transfer_ownership", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 40535, inputs: [], name: "kill_me", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 23372, inputs: [], name: "unkill_me", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 38505, inputs: [{ name: "_admin_fee_receiver", type: "address" }], name: "set_admin_fee_receiver", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 3378, inputs: [], name: "last_prices_timestamp", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3408, inputs: [], name: "initial_A_gamma", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3438, inputs: [], name: "future_A_gamma", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3468, inputs: [], name: "initial_A_gamma_time", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3498, inputs: [], name: "future_A_gamma_time", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3528, inputs: [], name: "allowed_extra_profit", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3558, inputs: [], name: "future_allowed_extra_profit", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3588, inputs: [], name: "fee_gamma", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3618, inputs: [], name: "future_fee_gamma", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3648, inputs: [], name: "adjustment_step", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3678, inputs: [], name: "future_adjustment_step", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3708, inputs: [], name: "ma_half_time", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3738, inputs: [], name: "future_ma_half_time", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3768, inputs: [], name: "mid_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3798, inputs: [], name: "out_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3828, inputs: [], name: "admin_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3858, inputs: [], name: "future_mid_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3888, inputs: [], name: "future_out_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3918, inputs: [], name: "future_admin_fee", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4057, inputs: [{ name: "arg0", type: "uint256" }], name: "balances", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3978, inputs: [], name: "D", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4008, inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 4038, inputs: [], name: "future_owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 4068, inputs: [], name: "xcp_profit", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4098, inputs: [], name: "xcp_profit_a", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4128, inputs: [], name: "virtual_price", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4158, inputs: [], name: "is_killed", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" }, { gas: 4188, inputs: [], name: "kill_deadline", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4218, inputs: [], name: "transfer_ownership_deadline", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4248, inputs: [], name: "admin_actions_deadline", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 4278, inputs: [], name: "admin_fee_receiver", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }];
const abiUSDTToken = [{ constant: true, inputs: [], name: "name", outputs: [{ name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "_upgradedAddress", type: "address" }], name: "deprecate", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ name: "_spender", type: "address" }, { name: "_value", type: "uint256" }], name: "approve", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "deprecated", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "_evilUser", type: "address" }], name: "addBlackList", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "_from", type: "address" }, { name: "_to", type: "address" }, { name: "_value", type: "uint256" }], name: "transferFrom", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "upgradedAddress", outputs: [{ name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ name: "", type: "address" }], name: "balances", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "decimals", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "maximumFee", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "_totalSupply", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [], name: "unpause", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [{ name: "_maker", type: "address" }], name: "getBlackListStatus", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ name: "", type: "address" }, { name: "", type: "address" }], name: "allowed", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ name: "who", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [], name: "pause", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "getOwner", outputs: [{ name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "_to", type: "address" }, { name: "_value", type: "uint256" }], name: "transfer", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ name: "newBasisPoints", type: "uint256" }, { name: "newMaxFee", type: "uint256" }], name: "setParams", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ name: "amount", type: "uint256" }], name: "issue", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ name: "amount", type: "uint256" }], name: "redeem", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [{ name: "_owner", type: "address" }, { name: "_spender", type: "address" }], name: "allowance", outputs: [{ name: "remaining", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "basisPointsRate", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ name: "", type: "address" }], name: "isBlackListed", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "_clearedUser", type: "address" }], name: "removeBlackList", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "MAX_UINT", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ name: "_blackListedUser", type: "address" }], name: "destroyBlackFunds", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { inputs: [{ name: "_initialSupply", type: "uint256" }, { name: "_name", type: "string" }, { name: "_symbol", type: "string" }, { name: "_decimals", type: "uint256" }], payable: false, stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: false, name: "amount", type: "uint256" }], name: "Issue", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "amount", type: "uint256" }], name: "Redeem", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "newAddress", type: "address" }], name: "Deprecate", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "feeBasisPoints", type: "uint256" }, { indexed: false, name: "maxFee", type: "uint256" }], name: "Params", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "_blackListedUser", type: "address" }, { indexed: false, name: "_balance", type: "uint256" }], name: "DestroyedBlackFunds", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "_user", type: "address" }], name: "AddedBlackList", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "_user", type: "address" }], name: "RemovedBlackList", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "owner", type: "address" }, { indexed: true, name: "spender", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Approval", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }, { indexed: false, name: "value", type: "uint256" }], name: "Transfer", type: "event" }, { anonymous: false, inputs: [], name: "Pause", type: "event" }, { anonymous: false, inputs: [], name: "Unpause", type: "event" }];
const abiWETH9Token = [{ constant: true, inputs: [], name: "name", outputs: [{ name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "guy", type: "address" }, { name: "wad", type: "uint256" }], name: "approve", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "src", type: "address" }, { name: "dst", type: "address" }, { name: "wad", type: "uint256" }], name: "transferFrom", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ name: "wad", type: "uint256" }], name: "withdraw", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [{ name: "", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ name: "dst", type: "address" }, { name: "wad", type: "uint256" }], name: "transfer", outputs: [{ name: "", type: "bool" }], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [], name: "deposit", outputs: [], payable: true, stateMutability: "payable", type: "function" }, { constant: true, inputs: [{ name: "", type: "address" }, { name: "", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { payable: true, stateMutability: "payable", type: "fallback" }, { anonymous: false, inputs: [{ indexed: true, name: "src", type: "address" }, { indexed: true, name: "guy", type: "address" }, { indexed: false, name: "wad", type: "uint256" }], name: "Approval", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "src", type: "address" }, { indexed: true, name: "dst", type: "address" }, { indexed: false, name: "wad", type: "uint256" }], name: "Transfer", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "dst", type: "address" }, { indexed: false, name: "wad", type: "uint256" }], name: "Deposit", type: "event" }, { anonymous: false, inputs: [{ indexed: true, name: "src", type: "address" }, { indexed: false, name: "wad", type: "uint256" }], name: "Withdrawal", type: "event" }];
const abiCurveFactory = [{ anonymous: false, inputs: [{ indexed: false, name: "base_pool", type: "address" }], name: "BasePoolAdded", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "coins", type: "address[4]" }, { indexed: false, name: "A", type: "uint256" }, { indexed: false, name: "fee", type: "uint256" }, { indexed: false, name: "deployer", type: "address" }], name: "PlainPoolDeployed", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "coin", type: "address" }, { indexed: false, name: "base_pool", type: "address" }, { indexed: false, name: "A", type: "uint256" }, { indexed: false, name: "fee", type: "uint256" }, { indexed: false, name: "deployer", type: "address" }], name: "MetaPoolDeployed", type: "event" }, { anonymous: false, inputs: [{ indexed: false, name: "pool", type: "address" }, { indexed: false, name: "gauge", type: "address" }], name: "LiquidityGaugeDeployed", type: "event" }, { inputs: [{ name: "_fee_receiver", type: "address" }], outputs: [], stateMutability: "nonpayable", type: "constructor" }, { gas: 21716, inputs: [{ name: "_base_pool", type: "address" }], name: "metapool_implementations", outputs: [{ name: "", type: "address[10]" }], stateMutability: "view", type: "function" }, { inputs: [{ name: "_from", type: "address" }, { name: "_to", type: "address" }], name: "find_pool_for_coins", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ name: "_from", type: "address" }, { name: "_to", type: "address" }, { name: "i", type: "uint256" }], name: "find_pool_for_coins1", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 2663, inputs: [{ name: "_pool", type: "address" }], name: "get_base_pool", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 2699, inputs: [{ name: "_pool", type: "address" }], name: "get_n_coins", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 5201, inputs: [{ name: "_pool", type: "address" }], name: "get_meta_n_coins", outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 9164, inputs: [{ name: "_pool", type: "address" }], name: "get_coins", outputs: [{ name: "", type: "address[4]" }], stateMutability: "view", type: "function" }, { gas: 21345, inputs: [{ name: "_pool", type: "address" }], name: "get_underlying_coins", outputs: [{ name: "", type: "address[8]" }], stateMutability: "view", type: "function" }, { gas: 20185, inputs: [{ name: "_pool", type: "address" }], name: "get_decimals", outputs: [{ name: "", type: "uint256[4]" }], stateMutability: "view", type: "function" }, { gas: 19730, inputs: [{ name: "_pool", type: "address" }], name: "get_underlying_decimals", outputs: [{ name: "", type: "uint256[8]" }], stateMutability: "view", type: "function" }, { gas: 5281, inputs: [{ name: "_pool", type: "address" }], name: "get_metapool_rates", outputs: [{ name: "", type: "uint256[2]" }], stateMutability: "view", type: "function" }, { gas: 20435, inputs: [{ name: "_pool", type: "address" }], name: "get_balances", outputs: [{ name: "", type: "uint256[4]" }], stateMutability: "view", type: "function" }, { gas: 39733, inputs: [{ name: "_pool", type: "address" }], name: "get_underlying_balances", outputs: [{ name: "", type: "uint256[8]" }], stateMutability: "view", type: "function" }, { gas: 3135, inputs: [{ name: "_pool", type: "address" }], name: "get_A", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 5821, inputs: [{ name: "_pool", type: "address" }], name: "get_fees", outputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 13535, inputs: [{ name: "_pool", type: "address" }], name: "get_admin_balances", outputs: [{ name: "", type: "uint256[4]" }], stateMutability: "view", type: "function" }, { gas: 33407, inputs: [{ name: "_pool", type: "address" }, { name: "_from", type: "address" }, { name: "_to", type: "address" }], name: "get_coin_indices", outputs: [{ name: "", type: "int128" }, { name: "", type: "int128" }, { name: "", type: "bool" }], stateMutability: "view", type: "function" }, { gas: 3089, inputs: [{ name: "_pool", type: "address" }], name: "get_gauge", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3119, inputs: [{ name: "_pool", type: "address" }], name: "get_implementation_address", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3152, inputs: [{ name: "_pool", type: "address" }], name: "is_meta", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" }, { gas: 5450, inputs: [{ name: "_pool", type: "address" }], name: "get_pool_asset_type", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 5480, inputs: [{ name: "_pool", type: "address" }], name: "get_fee_receiver", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { inputs: [{ name: "_name", type: "string" }, { name: "_symbol", type: "string" }, { name: "_coins", type: "address[4]" }, { name: "_A", type: "uint256" }, { name: "_fee", type: "uint256" }], name: "deploy_plain_pool", outputs: [{ name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ name: "_name", type: "string" }, { name: "_symbol", type: "string" }, { name: "_coins", type: "address[4]" }, { name: "_A", type: "uint256" }, { name: "_fee", type: "uint256" }, { name: "_asset_type", type: "uint256" }], name: "deploy_plain_pool", outputs: [{ name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ name: "_name", type: "string" }, { name: "_symbol", type: "string" }, { name: "_coins", type: "address[4]" }, { name: "_A", type: "uint256" }, { name: "_fee", type: "uint256" }, { name: "_asset_type", type: "uint256" }, { name: "_implementation_idx", type: "uint256" }], name: "deploy_plain_pool", outputs: [{ name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ name: "_base_pool", type: "address" }, { name: "_name", type: "string" }, { name: "_symbol", type: "string" }, { name: "_coin", type: "address" }, { name: "_A", type: "uint256" }, { name: "_fee", type: "uint256" }], name: "deploy_metapool", outputs: [{ name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }, { inputs: [{ name: "_base_pool", type: "address" }, { name: "_name", type: "string" }, { name: "_symbol", type: "string" }, { name: "_coin", type: "address" }, { name: "_A", type: "uint256" }, { name: "_fee", type: "uint256" }, { name: "_implementation_idx", type: "uint256" }], name: "deploy_metapool1", outputs: [{ name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }, { gas: 93079, inputs: [{ name: "_pool", type: "address" }], name: "deploy_gauge", outputs: [{ name: "", type: "address" }], stateMutability: "nonpayable", type: "function" }, { gas: 1206132, inputs: [{ name: "_base_pool", type: "address" }, { name: "_fee_receiver", type: "address" }, { name: "_asset_type", type: "uint256" }, { name: "_implementations", type: "address[10]" }], name: "add_base_pool", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 382072, inputs: [{ name: "_base_pool", type: "address" }, { name: "_implementations", type: "address[10]" }], name: "set_metapool_implementations", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 379687, inputs: [{ name: "_n_coins", type: "uint256" }, { name: "_implementations", type: "address[10]" }], name: "set_plain_implementations", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 38355, inputs: [{ name: "_gauge_implementation", type: "address" }], name: "set_gauge_implementation", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 1139545, inputs: [{ name: "_pools", type: "address[32]" }, { name: "_asset_types", type: "uint256[32]" }], name: "batch_set_pool_asset_type", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 38415, inputs: [{ name: "_addr", type: "address" }], name: "commit_transfer_ownership", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 58366, inputs: [], name: "accept_transfer_ownership", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 40996, inputs: [{ name: "_manager", type: "address" }], name: "set_manager", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 38770, inputs: [{ name: "_base_pool", type: "address" }, { name: "_fee_receiver", type: "address" }], name: "set_fee_receiver", outputs: [], stateMutability: "nonpayable", type: "function" }, { gas: 12880, inputs: [], name: "convert_metapool_fees", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { gas: 8610792, inputs: [{ name: "_pools", type: "address[10]" }], name: "add_existing_metapools", outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }, { gas: 3438, inputs: [], name: "admin", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3468, inputs: [], name: "future_admin", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3498, inputs: [], name: "manager", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3573, inputs: [{ name: "arg0", type: "uint256" }], name: "pool_list", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3558, inputs: [], name: "pool_count", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3633, inputs: [{ name: "arg0", type: "uint256" }], name: "base_pool_list", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3618, inputs: [], name: "base_pool_count", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }, { gas: 3863, inputs: [{ name: "arg0", type: "address" }], name: "base_pool_assets", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" }, { gas: 3838, inputs: [{ name: "arg0", type: "uint256" }, { name: "arg1", type: "uint256" }], name: "plain_implementations", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }, { gas: 3708, inputs: [], name: "gauge_implementation", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }];
const abi3CRVToken = [{ name: "Transfer", inputs: [{ type: "address", name: "_from", indexed: true }, { type: "address", name: "_to", indexed: true }, { type: "uint256", name: "_value", indexed: false }], anonymous: false, type: "event" }, { name: "Approval", inputs: [{ type: "address", name: "_owner", indexed: true }, { type: "address", name: "_spender", indexed: true }, { type: "uint256", name: "_value", indexed: false }], anonymous: false, type: "event" }, { outputs: [], inputs: [{ type: "string", name: "_name" }, { type: "string", name: "_symbol" }, { type: "uint256", name: "_decimals" }, { type: "uint256", name: "_supply" }], stateMutability: "nonpayable", type: "constructor" }, { name: "set_minter", outputs: [], inputs: [{ type: "address", name: "_minter" }], stateMutability: "nonpayable", type: "function", gas: 36247 }, { name: "set_name", outputs: [], inputs: [{ type: "string", name: "_name" }, { type: "string", name: "_symbol" }], stateMutability: "nonpayable", type: "function", gas: 178069 }, { name: "totalSupply", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 1211 }, { name: "allowance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "address", name: "_owner" }, { type: "address", name: "_spender" }], stateMutability: "view", type: "function", gas: 1549 }, { name: "transfer", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 74832 }, { name: "transferFrom", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_from" }, { type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 111983 }, { name: "approve", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_spender" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 39078 }, { name: "mint", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 75808 }, { name: "burnFrom", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 75826 }, { name: "name", outputs: [{ type: "string", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 7823 }, { name: "symbol", outputs: [{ type: "string", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 6876 }, { name: "decimals", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 1481 }, { name: "balanceOf", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "address", name: "arg0" }], stateMutability: "view", type: "function", gas: 1665 }];
const abiCurve3Pool = [{ name: "TokenExchange", inputs: [{ type: "address", name: "buyer", indexed: true }, { type: "int128", name: "sold_id", indexed: false }, { type: "uint256", name: "tokens_sold", indexed: false }, { type: "int128", name: "bought_id", indexed: false }, { type: "uint256", name: "tokens_bought", indexed: false }], anonymous: false, type: "event" }, { name: "AddLiquidity", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[3]", name: "token_amounts", indexed: false }, { type: "uint256[3]", name: "fees", indexed: false }, { type: "uint256", name: "invariant", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidity", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[3]", name: "token_amounts", indexed: false }, { type: "uint256[3]", name: "fees", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidityOne", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256", name: "token_amount", indexed: false }, { type: "uint256", name: "coin_amount", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidityImbalance", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[3]", name: "token_amounts", indexed: false }, { type: "uint256[3]", name: "fees", indexed: false }, { type: "uint256", name: "invariant", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "CommitNewAdmin", inputs: [{ type: "uint256", name: "deadline", indexed: true }, { type: "address", name: "admin", indexed: true }], anonymous: false, type: "event" }, { name: "NewAdmin", inputs: [{ type: "address", name: "admin", indexed: true }], anonymous: false, type: "event" }, { name: "CommitNewFee", inputs: [{ type: "uint256", name: "deadline", indexed: true }, { type: "uint256", name: "fee", indexed: false }, { type: "uint256", name: "admin_fee", indexed: false }], anonymous: false, type: "event" }, { name: "NewFee", inputs: [{ type: "uint256", name: "fee", indexed: false }, { type: "uint256", name: "admin_fee", indexed: false }], anonymous: false, type: "event" }, { name: "RampA", inputs: [{ type: "uint256", name: "old_A", indexed: false }, { type: "uint256", name: "new_A", indexed: false }, { type: "uint256", name: "initial_time", indexed: false }, { type: "uint256", name: "future_time", indexed: false }], anonymous: false, type: "event" }, { name: "StopRampA", inputs: [{ type: "uint256", name: "A", indexed: false }, { type: "uint256", name: "t", indexed: false }], anonymous: false, type: "event" }, { outputs: [], inputs: [{ type: "address", name: "_owner" }, { type: "address[3]", name: "_coins" }, { type: "address", name: "_pool_token" }, { type: "uint256", name: "_A" }, { type: "uint256", name: "_fee" }, { type: "uint256", name: "_admin_fee" }], stateMutability: "nonpayable", type: "constructor" }, { name: "A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 5227 }, { name: "get_virtual_price", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 1133537 }, { name: "calc_token_amount", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[3]", name: "amounts" }, { type: "bool", name: "deposit" }], stateMutability: "view", type: "function", gas: 4508776 }, { name: "add_liquidity", outputs: [], inputs: [{ type: "uint256[3]", name: "amounts" }, { type: "uint256", name: "min_mint_amount" }], stateMutability: "nonpayable", type: "function", gas: 6954858 }, { name: "get_dy", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }], stateMutability: "view", type: "function", gas: 2673791 }, { name: "get_dy_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }], stateMutability: "view", type: "function", gas: 2673474 }, { name: "exchange", outputs: [], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }], stateMutability: "nonpayable", type: "function", gas: 2818066 }, { name: "remove_liquidity", outputs: [], inputs: [{ type: "uint256", name: "_amount" }, { type: "uint256[3]", name: "min_amounts" }], stateMutability: "nonpayable", type: "function", gas: 192846 }, { name: "remove_liquidity_imbalance", outputs: [], inputs: [{ type: "uint256[3]", name: "amounts" }, { type: "uint256", name: "max_burn_amount" }], stateMutability: "nonpayable", type: "function", gas: 6951851 }, { name: "calc_withdraw_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_token_amount" }, { type: "int128", name: "i" }], stateMutability: "view", type: "function", gas: 1102 }, { name: "remove_liquidity_one_coin", outputs: [], inputs: [{ type: "uint256", name: "_token_amount" }, { type: "int128", name: "i" }, { type: "uint256", name: "min_amount" }], stateMutability: "nonpayable", type: "function", gas: 4025523 }, { name: "ramp_A", outputs: [], inputs: [{ type: "uint256", name: "_future_A" }, { type: "uint256", name: "_future_time" }], stateMutability: "nonpayable", type: "function", gas: 151919 }, { name: "stop_ramp_A", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 148637 }, { name: "commit_new_fee", outputs: [], inputs: [{ type: "uint256", name: "new_fee" }, { type: "uint256", name: "new_admin_fee" }], stateMutability: "nonpayable", type: "function", gas: 110461 }, { name: "apply_new_fee", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 97242 }, { name: "revert_new_parameters", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 21895 }, { name: "commit_transfer_ownership", outputs: [], inputs: [{ type: "address", name: "_owner" }], stateMutability: "nonpayable", type: "function", gas: 74572 }, { name: "apply_transfer_ownership", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 60710 }, { name: "revert_transfer_ownership", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 21985 }, { name: "admin_balances", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "i" }], stateMutability: "view", type: "function", gas: 3481 }, { name: "withdraw_admin_fees", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 21502 }, { name: "donate_admin_fees", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 111389 }, { name: "kill_me", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 37998 }, { name: "unkill_me", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 22135 }, { name: "coins", outputs: [{ type: "address", name: "" }], inputs: [{ type: "uint256", name: "arg0" }], stateMutability: "view", type: "function", gas: 2220 }, { name: "balances", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "arg0" }], stateMutability: "view", type: "function", gas: 2250 }, { name: "fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2171 }, { name: "admin_fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2201 }, { name: "owner", outputs: [{ type: "address", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2231 }, { name: "initial_A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2261 }, { name: "future_A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2291 }, { name: "initial_A_time", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2321 }, { name: "future_A_time", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2351 }, { name: "admin_actions_deadline", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2381 }, { name: "transfer_ownership_deadline", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2411 }, { name: "future_fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2441 }, { name: "future_admin_fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2471 }, { name: "future_owner", outputs: [{ type: "address", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2501 }];
const abiOUSDSwap = [{ constant: true, inputs: [], name: "governor", outputs: [{ internalType: "address", name: "", type: "address" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "buyOusdWithUsdt", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "buyOusdWithDai", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [], name: "claimGovernance", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [], name: "withdrawAll", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "sellOusdForDai", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "buyOusdWithUsdc", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "sellOusdForUsdc", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: true, inputs: [], name: "isGovernor", outputs: [{ internalType: "bool", name: "", type: "bool" }], payable: false, stateMutability: "view", type: "function" }, { constant: false, inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }], name: "sellOusdForUsdt", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "_newGovernor", type: "address" }], name: "transferGovernance", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [{ internalType: "address", name: "token", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], name: "withdraw", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { constant: false, inputs: [], name: "rebaseOptIn", outputs: [], payable: false, stateMutability: "nonpayable", type: "function" }, { inputs: [], payable: false, stateMutability: "nonpayable", type: "constructor" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousGovernor", type: "address" }, { indexed: true, internalType: "address", name: "newGovernor", type: "address" }], name: "PendingGovernorshipTransfer", type: "event" }, { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousGovernor", type: "address" }, { indexed: true, internalType: "address", name: "newGovernor", type: "address" }], name: "GovernorshipTransferred", type: "event" }];
const abi3PoolImplementation = [{ name: "Transfer", inputs: [{ type: "address", name: "sender", indexed: true }, { type: "address", name: "receiver", indexed: true }, { type: "uint256", name: "value", indexed: false }], anonymous: false, type: "event" }, { name: "Approval", inputs: [{ type: "address", name: "owner", indexed: true }, { type: "address", name: "spender", indexed: true }, { type: "uint256", name: "value", indexed: false }], anonymous: false, type: "event" }, { name: "TokenExchange", inputs: [{ type: "address", name: "buyer", indexed: true }, { type: "int128", name: "sold_id", indexed: false }, { type: "uint256", name: "tokens_sold", indexed: false }, { type: "int128", name: "bought_id", indexed: false }, { type: "uint256", name: "tokens_bought", indexed: false }], anonymous: false, type: "event" }, { name: "TokenExchangeUnderlying", inputs: [{ type: "address", name: "buyer", indexed: true }, { type: "int128", name: "sold_id", indexed: false }, { type: "uint256", name: "tokens_sold", indexed: false }, { type: "int128", name: "bought_id", indexed: false }, { type: "uint256", name: "tokens_bought", indexed: false }], anonymous: false, type: "event" }, { name: "AddLiquidity", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[2]", name: "token_amounts", indexed: false }, { type: "uint256[2]", name: "fees", indexed: false }, { type: "uint256", name: "invariant", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidity", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[2]", name: "token_amounts", indexed: false }, { type: "uint256[2]", name: "fees", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidityOne", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256", name: "token_amount", indexed: false }, { type: "uint256", name: "coin_amount", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "RemoveLiquidityImbalance", inputs: [{ type: "address", name: "provider", indexed: true }, { type: "uint256[2]", name: "token_amounts", indexed: false }, { type: "uint256[2]", name: "fees", indexed: false }, { type: "uint256", name: "invariant", indexed: false }, { type: "uint256", name: "token_supply", indexed: false }], anonymous: false, type: "event" }, { name: "CommitNewAdmin", inputs: [{ type: "uint256", name: "deadline", indexed: true }, { type: "address", name: "admin", indexed: true }], anonymous: false, type: "event" }, { name: "NewAdmin", inputs: [{ type: "address", name: "admin", indexed: true }], anonymous: false, type: "event" }, { name: "CommitNewFee", inputs: [{ type: "uint256", name: "deadline", indexed: true }, { type: "uint256", name: "fee", indexed: false }, { type: "uint256", name: "admin_fee", indexed: false }], anonymous: false, type: "event" }, { name: "NewFee", inputs: [{ type: "uint256", name: "fee", indexed: false }, { type: "uint256", name: "admin_fee", indexed: false }], anonymous: false, type: "event" }, { name: "RampA", inputs: [{ type: "uint256", name: "old_A", indexed: false }, { type: "uint256", name: "new_A", indexed: false }, { type: "uint256", name: "initial_time", indexed: false }, { type: "uint256", name: "future_time", indexed: false }], anonymous: false, type: "event" }, { name: "StopRampA", inputs: [{ type: "uint256", name: "A", indexed: false }, { type: "uint256", name: "t", indexed: false }], anonymous: false, type: "event" }, { outputs: [], inputs: [], stateMutability: "nonpayable", type: "constructor" }, { name: "initialize", outputs: [], inputs: [{ type: "string", name: "_name" }, { type: "string", name: "_symbol" }, { type: "address", name: "_coin" }, { type: "uint256", name: "_decimals" }, { type: "uint256", name: "_A" }, { type: "uint256", name: "_fee" }, { type: "address", name: "_admin" }], stateMutability: "nonpayable", type: "function", gas: 470049 }, { name: "decimals", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 291 }, { name: "transfer", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 75402 }, { name: "transferFrom", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_from" }, { type: "address", name: "_to" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 112037 }, { name: "approve", outputs: [{ type: "bool", name: "" }], inputs: [{ type: "address", name: "_spender" }, { type: "uint256", name: "_value" }], stateMutability: "nonpayable", type: "function", gas: 37854 }, { name: "get_previous_balances", outputs: [{ type: "uint256[2]", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2254 }, { name: "get_balances", outputs: [{ type: "uint256[2]", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2284 }, { name: "get_twap_balances", outputs: [{ type: "uint256[2]", name: "" }], inputs: [{ type: "uint256[2]", name: "_first_balances" }, { type: "uint256[2]", name: "_last_balances" }, { type: "uint256", name: "_time_elapsed" }], stateMutability: "view", type: "function", gas: 1522 }, { name: "get_price_cumulative_last", outputs: [{ type: "uint256[2]", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2344 }, { name: "admin_fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 621 }, { name: "A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 5859 }, { name: "A_precise", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 5821 }, { name: "get_virtual_price", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 1011891 }, { name: "calc_token_amount", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "bool", name: "_is_deposit" }], stateMutability: "view", type: "function" }, { name: "calc_token_amount1", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "bool", name: "_is_deposit" }, { type: "bool", name: "_previous" }], stateMutability: "view", type: "function" }, { name: "add_liquidity1", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_min_mint_amount" }], stateMutability: "nonpayable", type: "function" }, { name: "add_liquidity", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_min_mint_amount" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "get_dy", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }], stateMutability: "view", type: "function" }, { name: "get_dy", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256[2]", name: "_balances" }], stateMutability: "view", type: "function" }, { name: "get_dy_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }], stateMutability: "view", type: "function" }, { name: "get_dy_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256[2]", name: "_balances" }], stateMutability: "view", type: "function" }, { name: "exchange1", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }], stateMutability: "nonpayable", type: "function" }, { name: "exchange", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "exchange_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }], stateMutability: "nonpayable", type: "function" }, { name: "exchange_underlying", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "int128", name: "i" }, { type: "int128", name: "j" }, { type: "uint256", name: "dx" }, { type: "uint256", name: "min_dy" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity", outputs: [{ type: "uint256[2]", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "uint256[2]", name: "_min_amounts" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity", outputs: [{ type: "uint256[2]", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "uint256[2]", name: "_min_amounts" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity_imbalance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_max_burn_amount" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity_imbalance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256[2]", name: "_amounts" }, { type: "uint256", name: "_max_burn_amount" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "calc_withdraw_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }], stateMutability: "view", type: "function" }, { name: "calc_withdraw_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }, { type: "bool", name: "_previous" }], stateMutability: "view", type: "function" }, { name: "remove_liquidity_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }, { type: "uint256", name: "_min_received" }], stateMutability: "nonpayable", type: "function" }, { name: "remove_liquidity_one_coin", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "_burn_amount" }, { type: "int128", name: "i" }, { type: "uint256", name: "_min_received" }, { type: "address", name: "_receiver" }], stateMutability: "nonpayable", type: "function" }, { name: "ramp_A", outputs: [], inputs: [{ type: "uint256", name: "_future_A" }, { type: "uint256", name: "_future_time" }], stateMutability: "nonpayable", type: "function", gas: 152464 }, { name: "stop_ramp_A", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 149225 }, { name: "admin_balances", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "i" }], stateMutability: "view", type: "function", gas: 3601 }, { name: "withdraw_admin_fees", outputs: [], inputs: [], stateMutability: "nonpayable", type: "function", gas: 11347 }, { name: "admin", outputs: [{ type: "address", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2141 }, { name: "coins", outputs: [{ type: "address", name: "" }], inputs: [{ type: "uint256", name: "arg0" }], stateMutability: "view", type: "function", gas: 2280 }, { name: "balances", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "uint256", name: "arg0" }], stateMutability: "view", type: "function", gas: 2310 }, { name: "fee", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2231 }, { name: "block_timestamp_last", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2261 }, { name: "initial_A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2291 }, { name: "future_A", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2321 }, { name: "initial_A_time", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2351 }, { name: "future_A_time", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2381 }, { name: "name", outputs: [{ type: "string", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 8813 }, { name: "symbol", outputs: [{ type: "string", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 7866 }, { name: "balanceOf", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "address", name: "arg0" }], stateMutability: "view", type: "function", gas: 2686 }, { name: "allowance", outputs: [{ type: "uint256", name: "" }], inputs: [{ type: "address", name: "arg0" }, { type: "address", name: "arg1" }], stateMutability: "view", type: "function", gas: 2931 }, { name: "totalSupply", outputs: [{ type: "uint256", name: "" }], inputs: [], stateMutability: "view", type: "function", gas: 2531 }];
export {
    abilvUSD,
    abiArchToken,
    abiOUSDToken,
    abiCurveOUSDPool,
    abiCurveTripool2,
    abiUSDTToken,
    abiWETH9Token,
    abiCurveFactory,
    abi3CRVToken,
    abiCurve3Pool,
    abiOUSDSwap,
    abi3PoolImplementation,
};
