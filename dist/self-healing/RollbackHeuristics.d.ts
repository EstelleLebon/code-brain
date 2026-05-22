import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
export type RollbackScope = 'full' | 'partial' | 'targeted' | 'none';
export interface RollbackDecision {
    scope: RollbackScope;
    targetArtifacts: string[];
    confidence: number;
    reason: string;
}
export declare class RollbackHeuristics {
    /**
     * Determine rollback scope based on runtime signals and affected artifacts.
     * Uses causal reasoning: if signals point to specific files, do targeted rollback.
     */
    decide(signals: RuntimeSignal[], affectedArtifacts: string[], failureSeverity: number): RollbackDecision;
}
//# sourceMappingURL=RollbackHeuristics.d.ts.map