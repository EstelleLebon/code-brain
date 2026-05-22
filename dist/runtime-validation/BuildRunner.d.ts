import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';
export declare class BuildRunner extends BaseRunner {
    protected readonly signalType: RuntimeSignalType;
    protected readonly defaultConfig: RunnerConfig;
    constructor(command?: string, args?: string[], cwd?: string);
}
//# sourceMappingURL=BuildRunner.d.ts.map