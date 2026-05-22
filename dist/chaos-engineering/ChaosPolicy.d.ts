import { FaultType } from '../stress-testing/FaultInjection.js';
export type ChaosPolicyLevel = 'SAFE' | 'BALANCED' | 'AGGRESSIVE' | 'NUCLEAR';
export interface ChaosPolicy {
    level: ChaosPolicyLevel;
    maxConcurrentFaults: number;
    rollbackAggressiveness: number;
    allowedCorruption: FaultType[];
    retryPolicy: {
        maxRetries: number;
        backoffMs: number;
    };
    autoAbortThresholds: {
        maxRollbackDepth: number;
        minTrustScore: number;
        maxReplanRate: number;
    };
    faultProbabilityMultiplier: number;
}
export declare const CHAOS_POLICIES: Record<ChaosPolicyLevel, ChaosPolicy>;
//# sourceMappingURL=ChaosPolicy.d.ts.map