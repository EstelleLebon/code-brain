import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';
export type LintTool = 'eslint' | 'oxlint' | 'biome';
export declare class LintRunner extends BaseRunner {
    protected readonly signalType: RuntimeSignalType;
    protected readonly defaultConfig: RunnerConfig;
    constructor(tool?: LintTool, cwd?: string);
}
//# sourceMappingURL=LintRunner.d.ts.map