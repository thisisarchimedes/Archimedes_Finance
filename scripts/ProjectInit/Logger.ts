class LoggerClass {
    verbose: bool = false;
    log(message?: any, ...optionalParams: any[]): void {
        if (this.verbose) {
            console.log(message, ...optionalParams);
        }
    }
    setVerbose(verbose: bool): void {
        this.verbose = verbose;
    }
}

export const Logger = new LoggerClass();