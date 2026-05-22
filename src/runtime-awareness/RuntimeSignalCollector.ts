import { RuntimeSignal, RuntimeSignalType, RuntimeSignalStatus } from './RuntimeSignal.js';

export interface SignalCollectorConfig {
  source: string;
  timeoutMs?: number;
}

export interface CollectedSignal {
  signal: RuntimeSignal;
  raw?: string;
}

function makeId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export class RuntimeSignalCollector {
  private readonly source: string;

  constructor(config: SignalCollectorConfig) {
    this.source = config.source;
  }

  collect(
    signalType: RuntimeSignalType,
    status: RuntimeSignalStatus,
    metadata?: Record<string, unknown>,
    durationMs?: number,
  ): RuntimeSignal {
    return {
      id: makeId(),
      signalType,
      status,
      source: this.source,
      timestamp: Date.now(),
      durationMs,
      metadata,
    };
  }

  fromExitCode(
    signalType: RuntimeSignalType,
    exitCode: number,
    metadata?: Record<string, unknown>,
    durationMs?: number,
  ): RuntimeSignal {
    const status: RuntimeSignalStatus =
      exitCode === 0 ? 'success' : exitCode === 1 ? 'failure' : 'warning';
    return this.collect(signalType, status, { ...metadata, exitCode }, durationMs);
  }

  fromOutput(
    signalType: RuntimeSignalType,
    stdout: string,
    stderr: string,
    exitCode: number,
    durationMs?: number,
  ): RuntimeSignal {
    return this.fromExitCode(
      signalType,
      exitCode,
      { stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000) },
      durationMs,
    );
  }
}
