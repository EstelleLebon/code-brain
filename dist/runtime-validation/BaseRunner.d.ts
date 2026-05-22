import { RuntimeSignalCollector } from '../runtime-awareness/RuntimeSignalCollector.js';
import { RuntimeSignalType } from '../runtime-awareness/RuntimeSignal.js';
import { RunnerConfig, RunnerResult } from './types.js';
export declare abstract class BaseRunner {
    protected abstract readonly signalType: RuntimeSignalType;
    protected abstract readonly defaultConfig: RunnerConfig;
    protected collector: RuntimeSignalCollector;
    constructor(source: string);
    run(config?: Partial<RunnerConfig>): Promise<RunnerResult>;
    isAvailable(): boolean;
}
//# sourceMappingURL=BaseRunner.d.ts.map