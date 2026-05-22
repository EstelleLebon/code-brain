import { BaseRunner } from './BaseRunner.js';
import { RuntimeValidationResult } from './types.js';
export interface RuntimeValidationStage {
    name: string;
    runner: BaseRunner;
    optional?: boolean;
}
export declare class RuntimeValidationPipeline {
    private stages;
    addStage(stage: RuntimeValidationStage): this;
    run(cwd?: string): Promise<RuntimeValidationResult>;
}
//# sourceMappingURL=RuntimeValidationPipeline.d.ts.map