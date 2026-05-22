import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';

export class TypecheckRunner extends BaseRunner {
  protected readonly signalType: RuntimeSignalType = 'typecheck';
  protected readonly defaultConfig: RunnerConfig = {
    command: 'npx',
    args: ['tsc', '--noEmit'],
    timeoutMs: 60_000,
  };

  constructor(cwd?: string) {
    super('TypecheckRunner');
    if (cwd) this.defaultConfig = { ...this.defaultConfig, cwd };
  }
}
