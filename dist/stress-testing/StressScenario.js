"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENARIOS = void 0;
// ── Built-in scenario templates ──────────────────────────────────────────────
exports.SCENARIOS = {
    repeated_failures: {
        id: 'repeated_failures',
        label: 'Repeated Failures',
        stages: [
            {
                id: 's1',
                label: 'Burst failure phase',
                durationMs: 500,
                faults: [{ type: 'random_failure', probability: 0.8 }],
                expectation: { mustComplete: false },
            },
            {
                id: 's2',
                label: 'Recovery observation',
                durationMs: 300,
                faults: [],
                expectation: { minRecoveryRate: 0.5 },
            },
        ],
    },
    cascading_rollbacks: {
        id: 'cascading_rollbacks',
        label: 'Cascading Rollbacks',
        stages: [
            {
                id: 's1',
                label: 'Trigger rollback chain',
                durationMs: 600,
                faults: [
                    { type: 'partial_rollback', probability: 0.7 },
                    { type: 'random_failure', probability: 0.4 },
                ],
                expectation: { maxRollbackDepth: 5 },
            },
        ],
    },
    degraded_runtime: {
        id: 'degraded_runtime',
        label: 'Degraded Runtime',
        stages: [
            {
                id: 's1',
                label: 'Memory + timeout pressure',
                durationMs: 800,
                faults: [
                    { type: 'memory_pressure', probability: 0.6 },
                    { type: 'runtime_timeout', probability: 0.5 },
                ],
                expectation: { minRecoveryRate: 0.3 },
            },
        ],
    },
    retrieval_corruption: {
        id: 'retrieval_corruption',
        label: 'Retrieval Corruption',
        stages: [
            {
                id: 's1',
                label: 'Inject retrieval corruption',
                durationMs: 400,
                faults: [{ type: 'corrupted_retrieval', probability: 0.9 }],
            },
            {
                id: 's2',
                label: 'Stale snapshots',
                durationMs: 300,
                faults: [{ type: 'stale_snapshot', probability: 0.6 }],
            },
        ],
    },
    trust_instability: {
        id: 'trust_instability',
        label: 'Trust Instability',
        stages: [
            {
                id: 's1',
                label: 'Trust drift injection',
                durationMs: 700,
                faults: [{ type: 'trust_drift', probability: 0.75 }],
                expectation: { minRecoveryRate: 0.4 },
            },
        ],
    },
    planner_oscillation: {
        id: 'planner_oscillation',
        label: 'Planner Oscillation',
        stages: [
            {
                id: 's1',
                label: 'Force replanning cycles',
                durationMs: 500,
                faults: [
                    { type: 'random_failure', probability: 0.5 },
                    { type: 'partial_rollback', probability: 0.3 },
                ],
                expectation: { maxReplansAllowed: 10 },
            },
        ],
    },
};
//# sourceMappingURL=StressScenario.js.map