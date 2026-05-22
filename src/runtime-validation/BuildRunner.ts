import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';

export class BuildRunner extends BaseRunner {
  protected readonly signalType: RuntimeSignalType = 'build';
  protected readonly defaultConfig: RunnerConfig;

  constructor(command = 'npm', args = ['run', 'build'], cwd?: string) {
    super('BuildRunner');
    this.defaultConfig = { command, args, cwd, timeoutMs: 120_000 };
  }
}
