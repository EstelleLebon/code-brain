import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';

export interface RuntimeHealthReport {
  totalSignals: number;
  passRate: number;
  failRate: number;
  warningRate: number;
  byType: Map<string, { pass: number; fail: number; warn: number }>;
  overallHealth: number;  // 0-1
}

export class RuntimeHealthMetrics {
  private signals: RuntimeSignal[] = [];
  private readonly maxSignals: number;

  constructor(maxSignals = 200) {
    this.maxSignals = maxSignals;
  }

  ingest(signal: RuntimeSignal): void {
    this.signals.push(signal);
    if (this.signals.length > this.maxSignals) this.signals.shift();
  }

  ingestAll(signals: RuntimeSignal[]): void {
    for (const s of signals) this.ingest(s);
  }

  report(): RuntimeHealthReport {
    const total = this.signals.length;
    if (total === 0) {
      return { totalSignals: 0, passRate: 1, failRate: 0, warningRate: 0, byType: new Map(), overallHealth: 1 };
    }

    const pass = this.signals.filter(s => s.status === 'success').length;
    const fail = this.signals.filter(s => s.status === 'failure').length;
    const warn = this.signals.filter(s => s.status === 'warning').length;

    const byType = new Map<string, { pass: number; fail: number; warn: number }>();
    for (const s of this.signals) {
      const bucket = byType.get(s.signalType) ?? { pass: 0, fail: 0, warn: 0 };
      if (s.status === 'success') bucket.pass++;
      else if (s.status === 'failure') bucket.fail++;
      else bucket.warn++;
      byType.set(s.signalType, bucket);
    }

    const overallHealth = (pass + warn * 0.5) / total;

    return { totalSignals: total, passRate: pass / total, failRate: fail / total, warningRate: warn / total, byType, overallHealth };
  }
}
