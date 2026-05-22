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

export function makeOutcomeId(): string {
  return `outcome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
