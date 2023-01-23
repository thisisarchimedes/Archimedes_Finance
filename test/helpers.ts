import {
    BigNumber,
    utils,
} from "ethers";
import {
    ITransactionResponse,
    ITransactionReceipt,
    IEvent,
} from "./interfaces/EthersInterfaces";

// Contract Handling
async function findEvent (
    eventName: string,
    txResponse: ITransactionResponse,
): Promise<IEvent | undefined> {
    const txReceipt: ITransactionReceipt = await txResponse.wait();
    return txReceipt.events.find(e => e.event === eventName);
}

// Conversions
function ethNumToWeiBn (amount: number): BigNumber {
    return utils.parseUnits(amount.toString());
}

function ethStrToWeiBn (amount: string): BigNumber {
    return utils.parseUnits(amount);
}

function weiBnToEthNum (amount: BigNumber): number {
    return Number(utils.formatUnits(amount));
}

export {
    findEvent,
    ethNumToWeiBn,
    ethStrToWeiBn,
    weiBnToEthNum,
};
