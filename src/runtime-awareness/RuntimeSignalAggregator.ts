import { RuntimeSignal, RuntimeSignalType, RuntimeSignalStatus } from './RuntimeSignal.js';

export interface AggregatedSignals {
  byType: Partial<Record<RuntimeSignalType, RuntimeSignal[]>>;
  overallStatus: RuntimeSignalStatus;
  hasFailures: boolean;
  hasWarnings: boolean;
  totalCount: number;
}

export class RuntimeSignalAggregator {
  private signals: RuntimeSignal[] = [];

  add(signal: RuntimeSignal): void {
    this.signals.push(signal);
  }

  addMany(signals: RuntimeSignal[]): void {
    for (const s of signals) this.signals.push(s);
  }

  aggregate(): AggregatedSignals {
    const byType: Partial<Record<RuntimeSignalType, RuntimeSignal[]>> = {};
    for (const s of this.signals) {
      if (!byType[s.signalType]) byType[s.signalType] = [];
      byType[s.signalType]!.push(s);
    }

    const hasFailures = this.signals.some(s => s.status === 'failure');
    const hasWarnings = this.signals.some(s => s.status === 'warning');
    const overallStatus: RuntimeSignalStatus = hasFailures
      ? 'failure'
      : hasWarnings
        ? 'warning'
        : 'success';

    return {
      byType,
      overallStatus,
      hasFailures,
      hasWarnings,
      totalCount: this.signals.length,
    };
  }

  forType(type: RuntimeSignalType): RuntimeSignal[] {
    return this.signals.filter(s => s.signalType === type);
  }

  since(timestamp: number): RuntimeSignal[] {
    return this.signals.filter(s => s.timestamp >= timestamp);
  }

  clear(): void {
    this.signals = [];
  }

  all(): RuntimeSignal[] {
    return [...this.signals];
  }
}
