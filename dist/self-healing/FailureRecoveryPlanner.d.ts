import { type RollbackDecision } from './RollbackHeuristics.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { FailurePattern } from '../failure-memory/FailurePattern.js';
export type RecoveryStrategy = 'rollback' | 'retry' | 'reduce_scope' | 'switch_mode';
export interface RecoveryPlan {
    strategy: RecoveryStrategy;
    confidence: number;
    reason: string;
    rollback?: RollbackDecision;
    retryMaxMutations?: number;
    suggestedMode?: string;
}
export declare class FailureRecoveryPlanner {
    private heuristics;
    plan(signals: RuntimeSignal[], affectedArtifacts: string[], knownPatterns: FailurePattern[], failureSeverity: number): RecoveryPlan;
}
//# sourceMappingURL=FailureRecoveryPlanner.d.ts.map