"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeSignalCollector = void 0;
function makeId() {
    return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
class RuntimeSignalCollector {
    source;
    constructor(config) {
        this.source = config.source;
    }
    collect(signalType, status, metadata, durationMs) {
        return {
            id: makeId(),
            signalType,
            status,
            source: this.source,
            timestamp: Date.now(),
            durationMs,
            metadata,
        };
    }
    fromExitCode(signalType, exitCode, metadata, durationMs) {
        const status = exitCode === 0 ? 'success' : exitCode === 1 ? 'failure' : 'warning';
        return this.collect(signalType, status, { ...metadata, exitCode }, durationMs);
    }
    fromOutput(signalType, stdout, stderr, exitCode, durationMs) {
        return this.fromExitCode(signalType, exitCode, { stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000) }, durationMs);
    }
}
exports.RuntimeSignalCollector = RuntimeSignalCollector;
//# sourceMappingURL=RuntimeSignalCollector.js.map