import { FaultType } from './FaultInjection.js';
export interface StressExpectation {
    maxRollbackDepth?: number;
    minRecoveryRate?: number;
    maxReplansAllowed?: number;
    mustComplete?: boolean;
    allowedFaultTypes?: FaultType[];
}
export interface StressStage {
    id: string;
    label: string;
    durationMs: number;
    faults: Array<{
        type: FaultType;
        probability: number;
    }>;
    delayBeforeMs?: number;
    expectation?: StressExpectation;
}
export interface StressScenario {
    id: string;
    label: string;
    stages: StressStage[];
    globalExpectation?: StressExpectation;
}
export declare const SCENARIOS: Record<string, StressScenario>;
//# sourceMappingURL=StressScenario.d.ts.map