"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypecheckRunner = void 0;
const BaseRunner_js_1 = require("./BaseRunner.js");
class TypecheckRunner extends BaseRunner_js_1.BaseRunner {
    signalType = 'typecheck';
    defaultConfig = {
        command: 'npx',
        args: ['tsc', '--noEmit'],
        timeoutMs: 60_000,
    };
    constructor(cwd) {
        super('TypecheckRunner');
        if (cwd)
            this.defaultConfig = { ...this.defaultConfig, cwd };
    }
}
exports.TypecheckRunner = TypecheckRunner;
//# sourceMappingURL=TypecheckRunner.js.map