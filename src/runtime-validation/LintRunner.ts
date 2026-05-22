import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';

export type LintTool = 'eslint' | 'oxlint' | 'biome';

const LINT_COMMANDS: Record<LintTool, { command: string; args: string[] }> = {
  eslint: { command: 'npx', args: ['eslint', '.', '--max-warnings=0'] },
  oxlint: { command: 'npx', args: ['oxlint'] },
  biome:  { command: 'npx', args: ['biome', 'check', '.'] },
};

export class LintRunner extends BaseRunner {
  protected readonly signalType: RuntimeSignalType = 'lint';
  protected readonly defaultConfig: RunnerConfig;

  constructor(tool: LintTool = 'eslint', cwd?: string) {
    super(`LintRunner(${tool})`);
    const { command, args } = LINT_COMMANDS[tool];
    this.defaultConfig = { command, args, cwd, timeoutMs: 30_000 };
  }
}
