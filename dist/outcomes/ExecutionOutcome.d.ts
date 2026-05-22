import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
export type OutcomeStatus = 'success' | 'partial_success' | 'regression' | 'failure';
export interface ExecutionOutcome {
    id: string;
    operationId: string;
    outcome: OutcomeStatus;
    signals: RuntimeSignal[];
    riskObserved: number;
    summary: string[];
    timestamp: number;
}
export declare function makeOutcomeId(): string;
//# sourceMappingURL=ExecutionOutcome.d.ts.map