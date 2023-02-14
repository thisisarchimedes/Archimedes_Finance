class LoggerClass {
    verbose = false;
    log (message?: any, ...optionalParams: any[]): void {
        if (this.verbose) {
            console.log(message, ...optionalParams);
        }
    }

    setVerbose (verbose: boolean): void {
        this.verbose = verbose;
    }
}

export const Logger = new LoggerClass();
