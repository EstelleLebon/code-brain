import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';

export interface RunnerConfig {
  command: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface RunnerResult {
  signal: RuntimeSignal;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface RuntimeValidationResult {
  passed: boolean;
  signals: RuntimeSignal[];
  skipped: string[];
  durationMs: number;
}
