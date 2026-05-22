"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StressRunner = void 0;
const FaultInjection_js_1 = require("./FaultInjection.js");
function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}
class StressRunner {
    _injector;
    _reports = [];
    _aborted = false;
    _rollbackDepth = 0;
    _replans = 0;
    constructor(injector) {
        this._injector = injector ?? new FaultInjection_js_1.FaultInjector();
    }
    abort() {
        this._aborted = true;
    }
    async runScenario(scenario) {
        this._aborted = false;
        this._rollbackDepth = 0;
        this._replans = 0;
        const startedAt = new Date();
        const stageResults = [];
        let totalFaultsTriggered = 0;
        for (const stage of scenario.stages) {
            if (this._aborted)
                break;
            const result = await this._runStage(stage);
            stageResults.push(result);
            totalFaultsTriggered += result.faultsTriggered;
        }
        this._injector.clearAll();
        const completedAt = new Date();
        const passed = this._evaluateGlobal(scenario, stageResults);
        const report = {
            scenarioId: scenario.id,
            startedAt,
            completedAt,
            aborted: this._aborted,
            totalFaultsTriggered,
            stageResults,
            rollbackDepth: this._rollbackDepth,
            replans: this._replans,
            passed,
        };
        this._reports.push(report);
        return report;
    }
    async runBatch(scenarios) {
        const results = [];
        for (const s of scenarios) {
            if (this._aborted)
                break;
            results.push(await this.runScenario(s));
        }
        return results;
    }
    metrics() {
        if (this._reports.length === 0) {
            return { totalRuns: 0, passRate: 0, avgFaultsPerRun: 0, avgRollbackDepth: 0 };
        }
        const passed = this._reports.filter(r => r.passed).length;
        const totalFaults = this._reports.reduce((s, r) => s + r.totalFaultsTriggered, 0);
        const totalRollback = this._reports.reduce((s, r) => s + r.rollbackDepth, 0);
        return {
            totalRuns: this._reports.length,
            passRate: passed / this._reports.length,
            avgFaultsPerRun: totalFaults / this._reports.length,
            avgRollbackDepth: totalRollback / this._reports.length,
        };
    }
    reports() {
        return [...this._reports];
    }
    async _runStage(stage) {
        if (stage.delayBeforeMs)
            await sleep(stage.delayBeforeMs);
        // Inject faults for this stage
        const injectedIds = [];
        for (const f of stage.faults) {
            const fault = this._injector.inject({
                id: `stage-${stage.id}-${f.type}`,
                faultType: f.type,
                probability: f.probability,
                durationMs: stage.durationMs,
            });
            injectedIds.push(fault.id);
        }
        // Simulate stage execution by sampling fault triggers over time
        const startMs = Date.now();
        let faultsTriggered = 0;
        const sampleIntervalMs = Math.min(50, stage.durationMs / 4);
        const faultTypes = stage.faults.map(f => f.type);
        while (Date.now() - startMs < stage.durationMs && !this._aborted) {
            for (const type of faultTypes) {
                const result = this._injector.shouldTrigger(type);
                if (result.triggered) {
                    faultsTriggered++;
                    if (type === 'partial_rollback')
                        this._rollbackDepth++;
                    if (type === 'random_failure')
                        this._replans++;
                }
            }
            await sleep(sampleIntervalMs);
        }
        for (const id of injectedIds)
            this._injector.clear(id);
        const notes = [];
        let expectationsMet = true;
        if (stage.expectation) {
            const exp = stage.expectation;
            if (exp.maxRollbackDepth !== undefined && this._rollbackDepth > exp.maxRollbackDepth) {
                notes.push(`rollback depth ${this._rollbackDepth} exceeded limit ${exp.maxRollbackDepth}`);
                expectationsMet = false;
            }
            if (exp.maxReplansAllowed !== undefined && this._replans > exp.maxReplansAllowed) {
                notes.push(`replans ${this._replans} exceeded limit ${exp.maxReplansAllowed}`);
                expectationsMet = false;
            }
        }
        return {
            stageId: stage.id,
            label: stage.label,
            durationMs: Date.now() - startMs,
            faultsTriggered,
            expectationsMet,
            notes,
        };
    }
    _evaluateGlobal(scenario, results) {
        if (!scenario.globalExpectation) {
            return results.every(r => r.expectationsMet);
        }
        return results.every(r => r.expectationsMet);
    }
}
exports.StressRunner = StressRunner;
//# sourceMappingURL=StressRunner.js.map