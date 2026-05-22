export type RuntimeSignalType =
  | 'test'
  | 'lint'
  | 'build'
  | 'typecheck'
  | 'benchmark'
  | 'runtime_error'
  | 'coverage';

export type RuntimeSignalStatus = 'success' | 'warning' | 'failure';

export interface RuntimeSignal {
  id: string;
  signalType: RuntimeSignalType;
  status: RuntimeSignalStatus;
  source: string;
  timestamp: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface RuntimeSnapshot {
  id: string;
  operationId?: string;
  capturedAt: number;
  signals: RuntimeSignal[];
  summary: {
    total: number;
    success: number;
    warning: number;
    failure: number;
  };
}

export function createSnapshot(operationId: string | undefined, signals: RuntimeSignal[]): RuntimeSnapshot {
  const summary = signals.reduce(
    (acc, s) => {
      acc.total++;
      acc[s.status]++;
      return acc;
    },
    { total: 0, success: 0, warning: 0, failure: 0 }
  );
  return {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operationId,
    capturedAt: Date.now(),
    signals,
    summary,
  };
}
