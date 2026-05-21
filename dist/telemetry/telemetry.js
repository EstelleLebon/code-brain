"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalTelemetry = exports.Telemetry = void 0;
class Telemetry {
    enabled;
    metrics = [];
    constructor(enabled = true) {
        this.enabled = enabled;
    }
    log(level, event, data) {
        if (!this.enabled && level === 'debug')
            return;
        const entry = {
            timestamp: Date.now(),
            level,
            event,
            ...(data ? { data } : {}),
        };
        process.stderr.write(JSON.stringify(entry) + '\n');
    }
    time(label, fn) {
        const start = performance.now();
        try {
            const result = fn();
            const durationMs = Math.round(performance.now() - start);
            this.log('debug', 'timing', { label, durationMs });
            this.metric(`timing.${label}`, durationMs);
            return result;
        }
        catch (err) {
            const durationMs = Math.round(performance.now() - start);
            this.log('error', 'timing_error', { label, durationMs, error: String(err) });
            throw err;
        }
    }
    metric(name, value, tags) {
        const entry = { name, value, tags, timestamp: Date.now() };
        this.metrics.push(entry);
        if (this.enabled) {
            process.stderr.write(JSON.stringify({ type: 'metric', ...entry }) + '\n');
        }
    }
    getMetrics() {
        return this.metrics.slice();
    }
    clearMetrics() {
        this.metrics = [];
    }
}
exports.Telemetry = Telemetry;
exports.globalTelemetry = new Telemetry(process.env['CODE_BRAIN_TELEMETRY'] !== 'false');
//# sourceMappingURL=telemetry.js.map