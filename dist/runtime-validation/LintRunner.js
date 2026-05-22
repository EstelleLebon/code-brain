"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LintRunner = void 0;
const BaseRunner_js_1 = require("./BaseRunner.js");
const LINT_COMMANDS = {
    eslint: { command: 'npx', args: ['eslint', '.', '--max-warnings=0'] },
    oxlint: { command: 'npx', args: ['oxlint'] },
    biome: { command: 'npx', args: ['biome', 'check', '.'] },
};
class LintRunner extends BaseRunner_js_1.BaseRunner {
    signalType = 'lint';
    defaultConfig;
    constructor(tool = 'eslint', cwd) {
        super(`LintRunner(${tool})`);
        const { command, args } = LINT_COMMANDS[tool];
        this.defaultConfig = { command, args, cwd, timeoutMs: 30_000 };
    }
}
exports.LintRunner = LintRunner;
//# sourceMappingURL=LintRunner.js.map