import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import { BaseRunner } from './BaseRunner.js';
import { RuntimeValidationResult } from './types.js';

export interface RuntimeValidationStage {
  name: string;
  runner: BaseRunner;
  optional?: boolean;
}

export class RuntimeValidationPipeline {
  private stages: RuntimeValidationStage[] = [];

  addStage(stage: RuntimeValidationStage): this {
    this.stages.push(stage);
    return this;
  }

  async run(cwd?: string): Promise<RuntimeValidationResult> {
    const start = Date.now();
    const signals: RuntimeSignal[] = [];
    const skipped: string[] = [];

    for (const stage of this.stages) {
      if (!stage.runner.isAvailable()) {
        skipped.push(stage.name);
        continue;
      }

      const result = await stage.runner.run(cwd ? { cwd } : undefined);
      signals.push(result.signal);

      if (result.signal.status === 'failure' && !stage.optional) {
        return {
          passed: false,
          signals,
          skipped,
          durationMs: Date.now() - start,
        };
      }
    }

    const passed = signals.every(s => s.status !== 'failure');
    return { passed, signals, skipped, durationMs: Date.now() - start };
  }
}
