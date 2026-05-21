export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface MetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

export class Telemetry {
  private enabled: boolean;
  private metrics: MetricEntry[] = [];

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
    if (!this.enabled && level === 'debug') return;
    const entry = {
      timestamp: Date.now(),
      level,
      event,
      ...(data ? { data } : {}),
    };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  time<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const durationMs = Math.round(performance.now() - start);
      this.log('debug', 'timing', { label, durationMs });
      this.metric(`timing.${label}`, durationMs);
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      this.log('error', 'timing_error', { label, durationMs, error: String(err) });
      throw err;
    }
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    const entry: MetricEntry = { name, value, tags, timestamp: Date.now() };
    this.metrics.push(entry);
    if (this.enabled) {
      process.stderr.write(JSON.stringify({ type: 'metric', ...entry }) + '\n');
    }
  }

  getMetrics(): MetricEntry[] {
    return this.metrics.slice();
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const globalTelemetry = new Telemetry(process.env['CODE_BRAIN_TELEMETRY'] !== 'false');
