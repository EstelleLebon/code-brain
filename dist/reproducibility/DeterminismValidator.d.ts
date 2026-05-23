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
    validateDistributedEventOrdering(events: Array<{
        logicalClock: number;
        timestamp: number;
        nodeId: string;
        eventId: string;
    }>): boolean;
    validateConsensusDeterminism(runA: Array<{
        round: number;
        outcome: string;
    }>, runB: Array<{
        round: number;
        outcome: string;
    }>): boolean;
    validatePartitionReplayStability(runA: Array<{
        eventId: string;
        eventType: string;
    }>, runB: Array<{
        eventId: string;
        eventType: string;
    }>): boolean;
    validateMemoryReplicationConvergence(entries: Array<{
        key: string;
        value: unknown;
        nodeId: string;
        version: number;
    }>): boolean;
}
//# sourceMappingURL=DeterminismValidator.d.ts.map