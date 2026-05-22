import { FaultInjector } from './FaultInjection.js';
import { StressScenario } from './StressScenario.js';
export interface StageResult {
    stageId: string;
    label: string;
    durationMs: number;
    faultsTriggered: number;
    expectationsMet: boolean;
    notes: string[];
}
export interface StressReport {
    scenarioId: string;
    startedAt: Date;
    completedAt: Date;
    aborted: boolean;
    totalFaultsTriggered: number;
    stageResults: StageResult[];
    rollbackDepth: number;
    replans: number;
    passed: boolean;
}
export interface StressMetrics {
    totalRuns: number;
    passRate: number;
    avgFaultsPerRun: number;
    avgRollbackDepth: number;
}
export declare class StressRunner {
    private _injector;
    private _reports;
    private _aborted;
    private _rollbackDepth;
    private _replans;
    constructor(injector?: FaultInjector);
    abort(): void;
    runScenario(scenario: StressScenario): Promise<StressReport>;
    runBatch(scenarios: StressScenario[]): Promise<StressReport[]>;
    metrics(): StressMetrics;
    reports(): StressReport[];
    private _runStage;
    private _evaluateGlobal;
}
//# sourceMappingURL=StressRunner.d.ts.map