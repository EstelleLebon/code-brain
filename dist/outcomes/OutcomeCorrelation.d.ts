import { ExecutionOutcome, OutcomeStatus } from './ExecutionOutcome.js';
export interface CorrelationEntry {
    operationType: string;
    outcomes: OutcomeStatus[];
    failureRate: number;
    successRate: number;
    totalCount: number;
}
export declare class OutcomeCorrelation {
    private history;
    record(operationType: string, outcome: ExecutionOutcome): void;
    correlate(operationType: string): CorrelationEntry;
    allCorrelations(): CorrelationEntry[];
}
//# sourceMappingURL=OutcomeCorrelation.d.ts.map