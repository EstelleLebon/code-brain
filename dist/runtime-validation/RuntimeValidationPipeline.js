"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeValidationPipeline = void 0;
class RuntimeValidationPipeline {
    stages = [];
    addStage(stage) {
        this.stages.push(stage);
        return this;
    }
    async run(cwd) {
        const start = Date.now();
        const signals = [];
        const skipped = [];
        for (const stage of this.stages) {
            if (!stage.runner.isAvailable()) {
                skipped.push(stage.name);
                continue;
            }
            const result = await stage.runner.run(cwd ? { cwd } : undefined);
            signals.push(result.signal);
            if (result.signal.status === 'failure' && !stage.optional) {
                return {
                    passed: false,
                    signals,
                    skipped,
                    durationMs: Date.now() - start,
                };
            }
        }
        const passed = signals.every(s => s.status !== 'failure');
        return { passed, signals, skipped, durationMs: Date.now() - start };
    }
}
exports.RuntimeValidationPipeline = RuntimeValidationPipeline;
//# sourceMappingURL=RuntimeValidationPipeline.js.map