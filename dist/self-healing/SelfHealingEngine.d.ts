import { type RecoveryPlan } from './FailureRecoveryPlanner.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { FailureMemory } from '../failure-memory/FailureMemory.js';
import type { ExecutionResult } from '../semantic-execution/SemanticExecutor.js';
export interface HealingAttempt {
    executionId: string;
    plan: RecoveryPlan;
    timestamp: number;
    resolved: boolean;
}
export declare class SelfHealingEngine {
    private readonly failureMemory?;
    private planner;
    private history;
    constructor(failureMemory?: FailureMemory | undefined);
    /**
     * Analyse a failed execution result and produce a recovery plan.
     * Never throws — healing failures are isolated from the main loop.
     */
    heal(result: ExecutionResult, signals: RuntimeSignal[], failureSeverity?: number): RecoveryPlan;
    markResolved(executionId: string): void;
    getHistory(): HealingAttempt[];
    unresolvedCount(): number;
}
//# sourceMappingURL=SelfHealingEngine.d.ts.map