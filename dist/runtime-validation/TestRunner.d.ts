import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';
export type TestFramework = 'node' | 'jest' | 'vitest' | 'mocha';
export declare class TestRunner extends BaseRunner {
    protected readonly signalType: RuntimeSignalType;
    protected readonly defaultConfig: RunnerConfig;
    constructor(framework?: TestFramework, cwd?: string);
}
//# sourceMappingURL=TestRunner.d.ts.map