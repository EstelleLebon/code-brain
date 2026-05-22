import { ExecutionFingerprint, FingerprintDiff } from './ExecutionFingerprint.js';
export type ValidationResult = 'pass' | 'warn' | 'fail';
export interface ReplayConsistencyResult {
    executionId: string;
    result: ValidationResult;
    similarity: number;
    diff: FingerprintDiff;
    notes: string[];
}
export interface DeterminismReport {
    executionId: string;
    replayConsistency: ValidationResult;
    snapshotDeterminism: ValidationResult;
    planDeterminism: ValidationResult;
    eventOrderStability: ValidationResult;
    overall: ValidationResult;
    notes: string[];
}
export declare class DeterminismValidator {
    private _fingerprints;
    registerFingerprint(fp: ExecutionFingerprint): void;
    validateReplay(executionId: string): ReplayConsistencyResult;
    validateSnapshots(executionId: string): ValidationResult;
    validateDeterminism(executionId: string): DeterminismReport;
    reset(executionId?: string): void;
}
//# sourceMappingURL=DeterminismValidator.d.ts.map