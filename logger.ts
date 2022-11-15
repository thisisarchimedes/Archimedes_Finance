let loggingEnabled = false;

export function setLoggingEnabled(newValue: boolean) {
    loggingEnabled = newValue;
}

export function logger(...args: any[]) {
    if (loggingEnabled) {
        console.log(...args);
    }
}
