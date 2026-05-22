import {
  ExecutionFingerprint,
  FingerprintDiff,
  compareFingerprints,
} from './ExecutionFingerprint.js';

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

function combineResults(...results: ValidationResult[]): ValidationResult {
  if (results.some(r => r === 'fail')) return 'fail';
  if (results.some(r => r === 'warn')) return 'warn';
  return 'pass';
}

export class DeterminismValidator {
  private _fingerprints = new Map<string, ExecutionFingerprint[]>();

  registerFingerprint(fp: ExecutionFingerprint): void {
    const existing = this._fingerprints.get(fp.executionId) ?? [];
    existing.push(fp);
    this._fingerprints.set(fp.executionId, existing);
  }

  validateReplay(executionId: string): ReplayConsistencyResult {
    const fps = this._fingerprints.get(executionId) ?? [];
    if (fps.length < 2) {
      return {
        executionId,
        result: 'warn',
        similarity: 1,
        diff: { matching: [], diverging: [], identical: true, similarityScore: 1 },
        notes: ['fewer than 2 replay fingerprints registered'],
      };
    }

    const base = fps[0];
    const replays = fps.slice(1);
    const diffs = replays.map(r => compareFingerprints(base, r));
    const minSimilarity = Math.min(...diffs.map(d => d.similarityScore));
    const allIdentical = diffs.every(d => d.identical);

    const notes: string[] = [];
    let result: ValidationResult = 'pass';

    if (!allIdentical) {
      if (minSimilarity < 0.7) {
        result = 'fail';
        notes.push(`low replay similarity: ${minSimilarity.toFixed(2)}`);
      } else {
        result = 'warn';
        notes.push(`minor replay divergence: ${minSimilarity.toFixed(2)}`);
      }
    }

    return { executionId, result, similarity: minSimilarity, diff: diffs[0], notes };
  }

  validateSnapshots(executionId: string): ValidationResult {
    const fps = this._fingerprints.get(executionId) ?? [];
    if (fps.length === 0) return 'warn';
    // All fingerprints with same executionId should have same hash if deterministic
    const hashes = new Set(fps.map(f => f.hash));
    if (hashes.size === 1) return 'pass';
    if (hashes.size <= Math.ceil(fps.length / 2)) return 'warn';
    return 'fail';
  }

  validateDeterminism(executionId: string): DeterminismReport {
    const replayResult = this.validateReplay(executionId);
    const snapshotDeterminism = this.validateSnapshots(executionId);
    const planDeterminism = replayResult.result; // proxy: if replay is consistent, plan is too
    const eventOrderStability: ValidationResult = replayResult.similarity >= 0.9 ? 'pass' : 'warn';

    const overall = combineResults(
      replayResult.result,
      snapshotDeterminism,
      planDeterminism,
      eventOrderStability,
    );

    return {
      executionId,
      replayConsistency: replayResult.result,
      snapshotDeterminism,
      planDeterminism,
      eventOrderStability,
      overall,
      notes: replayResult.notes,
    };
  }

  reset(executionId?: string): void {
    if (executionId) {
      this._fingerprints.delete(executionId);
    } else {
      this._fingerprints.clear();
    }
  }
}
