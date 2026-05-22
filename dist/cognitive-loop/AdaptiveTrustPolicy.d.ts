import { TrustPolicy } from '../trust/TrustPolicy.js';
export interface AdaptiveTrustState {
    confidence: number;
    recentFailures: number;
    recentSuccesses: number;
    calibratedRiskDelta: number;
}
export declare class AdaptiveTrustPolicy {
    private base;
    private state;
    private readonly windowSize;
    constructor(base?: TrustPolicy, windowSize?: number);
    recordSuccess(): void;
    recordFailure(): void;
    private recalibrate;
    currentPolicy(): TrustPolicy;
    getState(): Readonly<AdaptiveTrustState>;
    reset(): void;
}
//# sourceMappingURL=AdaptiveTrustPolicy.d.ts.map