"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildRunner = void 0;
const BaseRunner_js_1 = require("./BaseRunner.js");
class BuildRunner extends BaseRunner_js_1.BaseRunner {
    signalType = 'build';
    defaultConfig;
    constructor(command = 'npm', args = ['run', 'build'], cwd) {
        super('BuildRunner');
        this.defaultConfig = { command, args, cwd, timeoutMs: 120_000 };
    }
}
exports.BuildRunner = BuildRunner;
//# sourceMappingURL=BuildRunner.js.map