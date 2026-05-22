"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAOS_POLICIES = void 0;
exports.CHAOS_POLICIES = {
    SAFE: {
        level: 'SAFE',
        maxConcurrentFaults: 1,
        rollbackAggressiveness: 0.1,
        allowedCorruption: ['random_failure'],
        retryPolicy: { maxRetries: 5, backoffMs: 100 },
        autoAbortThresholds: { maxRollbackDepth: 3, minTrustScore: 0.3, maxReplanRate: 5 },
        faultProbabilityMultiplier: 0.3,
    },
    BALANCED: {
        level: 'BALANCED',
        maxConcurrentFaults: 3,
        rollbackAggressiveness: 0.4,
        allowedCorruption: ['random_failure', 'runtime_timeout', 'memory_pressure'],
        retryPolicy: { maxRetries: 3, backoffMs: 50 },
        autoAbortThresholds: { maxRollbackDepth: 6, minTrustScore: 0.2, maxReplanRate: 10 },
        faultProbabilityMultiplier: 0.6,
    },
    AGGRESSIVE: {
        level: 'AGGRESSIVE',
        maxConcurrentFaults: 6,
        rollbackAggressiveness: 0.7,
        allowedCorruption: [
            'random_failure', 'runtime_timeout', 'memory_pressure',
            'corrupted_retrieval', 'trust_drift', 'partial_rollback',
        ],
        retryPolicy: { maxRetries: 2, backoffMs: 20 },
        autoAbortThresholds: { maxRollbackDepth: 10, minTrustScore: 0.1, maxReplanRate: 20 },
        faultProbabilityMultiplier: 0.85,
    },
    NUCLEAR: {
        level: 'NUCLEAR',
        maxConcurrentFaults: 12,
        rollbackAggressiveness: 1.0,
        allowedCorruption: [
            'random_failure', 'runtime_timeout', 'memory_pressure',
            'corrupted_retrieval', 'trust_drift', 'event_loss',
            'partial_rollback', 'stale_snapshot',
        ],
        retryPolicy: { maxRetries: 1, backoffMs: 0 },
        autoAbortThresholds: { maxRollbackDepth: 20, minTrustScore: 0.05, maxReplanRate: 50 },
        faultProbabilityMultiplier: 1.0,
    },
};
//# sourceMappingURL=ChaosPolicy.js.map