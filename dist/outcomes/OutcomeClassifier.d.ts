import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import { OutcomeStatus } from './ExecutionOutcome.js';
export declare class OutcomeClassifier {
    classify(signals: RuntimeSignal[]): {
        outcome: OutcomeStatus;
        summary: string[];
    };
}
//# sourceMappingURL=OutcomeClassifier.d.ts.map