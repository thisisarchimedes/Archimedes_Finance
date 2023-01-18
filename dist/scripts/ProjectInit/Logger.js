"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class LoggerClass {
    constructor() {
        this.verbose = false;
    }
    log(message, ...optionalParams) {
        if (this.verbose) {
            console.log(message, ...optionalParams);
        }
    }
    setVerbose(verbose) {
        this.verbose = verbose;
    }
}
exports.Logger = new LoggerClass();
