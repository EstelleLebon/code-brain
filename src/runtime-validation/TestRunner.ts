import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';

export type TestFramework = 'node' | 'jest' | 'vitest' | 'mocha';

const FRAMEWORK_COMMANDS: Record<TestFramework, { command: string; args: string[] }> = {
  node:   { command: 'node', args: ['--test'] },
  jest:   { command: 'npx', args: ['jest', '--passWithNoTests'] },
  vitest: { command: 'npx', args: ['vitest', 'run'] },
  mocha:  { command: 'npx', args: ['mocha'] },
};

export class TestRunner extends BaseRunner {
  protected readonly signalType: RuntimeSignalType = 'test';
  protected readonly defaultConfig: RunnerConfig;

  constructor(framework: TestFramework = 'node', cwd?: string) {
    super(`TestRunner(${framework})`);
    const { command, args } = FRAMEWORK_COMMANDS[framework];
    this.defaultConfig = { command, args, cwd, timeoutMs: 120_000 };
  }
}
