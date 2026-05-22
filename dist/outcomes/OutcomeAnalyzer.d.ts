import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import { ExecutionOutcome } from './ExecutionOutcome.js';
import { OutcomeCorrelation } from './OutcomeCorrelation.js';
export declare class OutcomeAnalyzer {
    private classifier;
    readonly correlation: OutcomeCorrelation;
    analyze(operationId: string, operationType: string, signals: RuntimeSignal[]): ExecutionOutcome;
}
//# sourceMappingURL=OutcomeAnalyzer.d.ts.map