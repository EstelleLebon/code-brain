"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRunner = void 0;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const RuntimeSignalCollector_js_1 = require("../runtime-awareness/RuntimeSignalCollector.js");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
class BaseRunner {
    collector;
    constructor(source) {
        this.collector = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source });
    }
    async run(config) {
        const cfg = { ...this.defaultConfig, ...config };
        const start = Date.now();
        try {
            const { stdout, stderr } = await execFileAsync(cfg.command, cfg.args ?? [], {
                cwd: cfg.cwd,
                timeout: cfg.timeoutMs ?? 30_000,
                env: { ...process.env, ...(cfg.env ?? {}) },
            });
            const durationMs = Date.now() - start;
            const signal = this.collector.fromOutput(this.signalType, stdout, stderr, 0, durationMs);
            return { signal, stdout, stderr, exitCode: 0, durationMs };
        }
        catch (err) {
            const durationMs = Date.now() - start;
            const e = err;
            const stdout = e.stdout ?? '';
            const stderr = e.stderr ?? '';
            const exitCode = e.code ?? 1;
            const signal = this.collector.fromOutput(this.signalType, stdout, stderr, exitCode, durationMs);
            return { signal, stdout, stderr, exitCode, durationMs };
        }
    }
    isAvailable() {
        return true;
    }
}
exports.BaseRunner = BaseRunner;
//# sourceMappingURL=BaseRunner.js.map