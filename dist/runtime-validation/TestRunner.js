"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
const BaseRunner_js_1 = require("./BaseRunner.js");
const FRAMEWORK_COMMANDS = {
    node: { command: 'node', args: ['--test'] },
    jest: { command: 'npx', args: ['jest', '--passWithNoTests'] },
    vitest: { command: 'npx', args: ['vitest', 'run'] },
    mocha: { command: 'npx', args: ['mocha'] },
};
class TestRunner extends BaseRunner_js_1.BaseRunner {
    signalType = 'test';
    defaultConfig;
    constructor(framework = 'node', cwd) {
        super(`TestRunner(${framework})`);
        const { command, args } = FRAMEWORK_COMMANDS[framework];
        this.defaultConfig = { command, args, cwd, timeoutMs: 120_000 };
    }
}
exports.TestRunner = TestRunner;
//# sourceMappingURL=TestRunner.js.map