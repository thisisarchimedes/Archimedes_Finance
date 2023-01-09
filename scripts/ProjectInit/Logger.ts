class LoggerClass {
    verbose: bool = false;
    log(message: String): void {
        if (this.verbose) {
            console.log(message);
        }
    }
    setVerbose(verbose: bool): void {
        this.verbose = verbose;
    }
}

export const Logger = new LoggerClass();