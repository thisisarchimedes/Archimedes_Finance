interface ITransactionResponse {
    wait: () => Promise<ITransactionReceipt>;
}

interface ITransactionReceipt {
    events: IEvent[];
}

interface IEvent {
    event: string;
    args;
}

export {
    ITransactionResponse,
    ITransactionReceipt,
    IEvent,
};
