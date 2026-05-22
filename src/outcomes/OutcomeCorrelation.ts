import { ExecutionOutcome, OutcomeStatus } from './ExecutionOutcome.js';

export interface CorrelationEntry {
  operationType: string;
  outcomes: OutcomeStatus[];
  failureRate: number;
  successRate: number;
  totalCount: number;
}

export class OutcomeCorrelation {
  private history: Array<{ operationType: string; outcome: ExecutionOutcome }> = [];

  record(operationType: string, outcome: ExecutionOutcome): void {
    this.history.push({ operationType, outcome });
  }

  correlate(operationType: string): CorrelationEntry {
    const entries = this.history.filter(e => e.operationType === operationType);
    const outcomes = entries.map(e => e.outcome.outcome);
    const total = outcomes.length;
    if (total === 0) {
      return { operationType, outcomes: [], failureRate: 0, successRate: 1, totalCount: 0 };
    }
    const failures = outcomes.filter(o => o === 'failure' || o === 'regression').length;
    const successes = outcomes.filter(o => o === 'success').length;
    return {
      operationType,
      outcomes,
      failureRate: failures / total,
      successRate: successes / total,
      totalCount: total,
    };
  }

  allCorrelations(): CorrelationEntry[] {
    const types = [...new Set(this.history.map(e => e.operationType))];
    return types.map(t => this.correlate(t));
  }
}
