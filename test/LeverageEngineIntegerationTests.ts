import { Signer } from "ethers";
import { buildContractTestContext, ContractTestContext } from "./ContractTestContext";
import { helperResetNetwork, helperSwapETHWithOUSD, defaultBlockNumber } from "./MainnetHelper";

describe("Test suit for creating leverage", function () {
    let r: ContractTestContext;
    let owner: Signer;
    let user: Signer;
    let pretenderOUSDSigner : Signer;

    before(async function () {
        // Reset network before integration tests
        helperResetNetwork(defaultBlockNumber);

        // Setup & deploy contracts
        r = await buildContractTestContext();
        owner = r.owner;
        user = r.addr1;
        pretenderOUSDSigner = r.addr3;

        // Setup pools
        

    });

    /// tests here will make sure the stage is set for creating leverage
    
});
