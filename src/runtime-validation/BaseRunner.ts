import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RuntimeSignalCollector } from '../runtime-awareness/RuntimeSignalCollector.js';
import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { RunnerConfig, RunnerResult } from './types.js';

const execFileAsync = promisify(execFile);

export abstract class BaseRunner {
  protected abstract readonly signalType: RuntimeSignalType;
  protected abstract readonly defaultConfig: RunnerConfig;

  protected collector: RuntimeSignalCollector;

  constructor(source: string) {
    this.collector = new RuntimeSignalCollector({ source });
  }

  async run(config?: Partial<RunnerConfig>): Promise<RunnerResult> {
    const cfg = { ...this.defaultConfig, ...config };
    const start = Date.now();

    try {
      const { stdout, stderr } = await execFileAsync(cfg.command, cfg.args ?? [], {
        cwd: cfg.cwd,
        timeout: cfg.timeoutMs ?? 30_000,
        env: { ...process.env, ...(cfg.env ?? {}) },
      });

      const durationMs = Date.now() - start;
      const signal = this.collector.fromOutput(this.signalType, stdout, stderr, 0, durationMs);
      return { signal, stdout, stderr, exitCode: 0, durationMs };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const e = err as { stdout?: string; stderr?: string; code?: number };
      const stdout = e.stdout ?? '';
      const stderr = e.stderr ?? '';
      const exitCode = e.code ?? 1;
      const signal = this.collector.fromOutput(
        this.signalType,
        stdout,
        stderr,
        exitCode,
        durationMs,
      );
      return { signal, stdout, stderr, exitCode, durationMs };
    }
  }

  isAvailable(): boolean {
    return true;
  }
}
