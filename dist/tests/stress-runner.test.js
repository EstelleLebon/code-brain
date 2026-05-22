"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const StressRunner_js_1 = require("../stress-testing/StressRunner.js");
const FaultInjection_js_1 = require("../stress-testing/FaultInjection.js");
const StressScenario_js_1 = require("../stress-testing/StressScenario.js");
function quickScenario(label = 'test') {
    return {
        id: `quick-${label}`,
        label,
        stages: [
            {
                id: 's1',
                label: 'fast stage',
                durationMs: 100,
                faults: [{ type: 'random_failure', probability: 0.8 }],
            },
        ],
    };
}
(0, node_test_1.describe)('StressRunner', () => {
    let runner;
    (0, node_test_1.beforeEach)(() => {
        runner = new StressRunner_js_1.StressRunner(new FaultInjection_js_1.FaultInjector(7));
    });
    (0, node_test_1.it)('returns a StressReport after running a scenario', async () => {
        const report = await runner.runScenario(quickScenario());
        strict_1.default.equal(report.scenarioId, 'quick-test');
        strict_1.default.ok(report.startedAt instanceof Date);
        strict_1.default.ok(report.completedAt instanceof Date);
        strict_1.default.ok(typeof report.totalFaultsTriggered === 'number');
    });
    (0, node_test_1.it)('report has stageResults for each stage', async () => {
        const report = await runner.runScenario(quickScenario());
        strict_1.default.equal(report.stageResults.length, 1);
        strict_1.default.equal(report.stageResults[0].stageId, 's1');
    });
    (0, node_test_1.it)('metrics accumulate across runs', async () => {
        await runner.runScenario(quickScenario('a'));
        await runner.runScenario(quickScenario('b'));
        const m = runner.metrics();
        strict_1.default.equal(m.totalRuns, 2);
        strict_1.default.ok(m.passRate >= 0 && m.passRate <= 1);
    });
    (0, node_test_1.it)('runBatch executes multiple scenarios', async () => {
        const reports = await runner.runBatch([quickScenario('x'), quickScenario('y')]);
        strict_1.default.equal(reports.length, 2);
    });
    (0, node_test_1.it)('abort stops batch mid-way', async () => {
        const longScenario = {
            id: 'long',
            label: 'long',
            stages: [
                { id: 's1', label: 'a', durationMs: 50, faults: [] },
                { id: 's2', label: 'b', durationMs: 50, faults: [] },
                { id: 's3', label: 'c', durationMs: 50, faults: [] },
            ],
        };
        // Abort immediately
        setTimeout(() => runner.abort(), 10);
        const report = await runner.runScenario(longScenario);
        strict_1.default.equal(report.aborted, true);
    });
    (0, node_test_1.it)('reports() returns all historical reports', async () => {
        await runner.runScenario(quickScenario());
        strict_1.default.equal(runner.reports().length, 1);
    });
    (0, node_test_1.it)('runs built-in repeated_failures scenario', async () => {
        const report = await runner.runScenario(StressScenario_js_1.SCENARIOS['repeated_failures']);
        strict_1.default.equal(report.scenarioId, 'repeated_failures');
        strict_1.default.ok(report.stageResults.length >= 2);
    });
    (0, node_test_1.it)('runs built-in cascading_rollbacks scenario', async () => {
        const report = await runner.runScenario(StressScenario_js_1.SCENARIOS['cascading_rollbacks']);
        strict_1.default.equal(report.scenarioId, 'cascading_rollbacks');
    });
    (0, node_test_1.it)('metrics passRate is 1 for zero-fault scenario', async () => {
        const noFault = {
            id: 'nf',
            label: 'no fault',
            stages: [{ id: 's1', label: 'empty', durationMs: 50, faults: [] }],
        };
        await runner.runScenario(noFault);
        const m = runner.metrics();
        strict_1.default.equal(m.passRate, 1);
    });
});
//# sourceMappingURL=stress-runner.test.js.map