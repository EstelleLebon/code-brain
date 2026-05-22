import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import { ExecutionOutcome, makeOutcomeId } from './ExecutionOutcome.js';
import { OutcomeClassifier } from './OutcomeClassifier.js';
import { OutcomeCorrelation } from './OutcomeCorrelation.js';

export class OutcomeAnalyzer {
  private classifier = new OutcomeClassifier();
  readonly correlation = new OutcomeCorrelation();

  analyze(operationId: string, operationType: string, signals: RuntimeSignal[]): ExecutionOutcome {
    const { outcome, summary } = this.classifier.classify(signals);

    const failureSignals = signals.filter(s => s.status === 'failure');
    const riskObserved = Math.min(100, failureSignals.length * 25);

    const result: ExecutionOutcome = {
      id: makeOutcomeId(),
      operationId,
      outcome,
      signals,
      riskObserved,
      summary,
      timestamp: Date.now(),
    };

    this.correlation.record(operationType, result);
    return result;
  }
}
