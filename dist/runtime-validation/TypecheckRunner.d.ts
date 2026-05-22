import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RunnerConfig } from './types.js';
export declare class TypecheckRunner extends BaseRunner {
    protected readonly signalType: RuntimeSignalType;
    protected readonly defaultConfig: RunnerConfig;
    constructor(cwd?: string);
}
//# sourceMappingURL=TypecheckRunner.d.ts.map