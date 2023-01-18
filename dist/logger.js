"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.setLoggingEnabled = void 0;
let loggingEnabled = false;
function setLoggingEnabled(newValue) {
    loggingEnabled = newValue;
}
exports.setLoggingEnabled = setLoggingEnabled;
function logger(...args) {
    if (loggingEnabled) {
        console.log(...args);
    }
}
exports.logger = logger;
