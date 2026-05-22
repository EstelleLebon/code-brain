import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';

export type RollbackScope = 'full' | 'partial' | 'targeted' | 'none';

export interface RollbackDecision {
  scope: RollbackScope;
  targetArtifacts: string[];  // file paths to roll back (empty = all)
  confidence: number;
  reason: string;
}

export class RollbackHeuristics {
  /**
   * Determine rollback scope based on runtime signals and affected artifacts.
   * Uses causal reasoning: if signals point to specific files, do targeted rollback.
   */
  decide(
    signals: RuntimeSignal[],
    affectedArtifacts: string[],
    failureSeverity: number,  // 0-100
  ): RollbackDecision {
    const errorSignals = signals.filter(s =>
      (s.signalType === 'test' || s.signalType === 'build' || s.signalType === 'typecheck') &&
      s.status === 'failure'
    );

    // No signals → cautious, don't rollback blindly
    if (signals.length === 0) {
      return { scope: 'none', targetArtifacts: [], confidence: 0.3, reason: 'No runtime signals to guide rollback' };
    }

    // Critical failure → full rollback
    if (failureSeverity >= 80 || errorSignals.length >= 3) {
      return {
        scope: 'full',
        targetArtifacts: affectedArtifacts,
        confidence: 0.9,
        reason: `High severity failure (${failureSeverity}) with ${errorSignals.length} error signals`,
      };
    }

    // Signals reference specific files → targeted rollback
    const referencedFiles = signals
      .flatMap(s => (s.metadata as Record<string, unknown>)?.files as string[] ?? [])
      .filter(Boolean);

    const targetable = affectedArtifacts.filter(a => referencedFiles.some(f => a.includes(f) || f.includes(a)));
    if (targetable.length > 0 && targetable.length < affectedArtifacts.length) {
      return {
        scope: 'targeted',
        targetArtifacts: targetable,
        confidence: 0.7,
        reason: `Targeting ${targetable.length}/${affectedArtifacts.length} artifacts based on signal causality`,
      };
    }

    // Moderate failure → partial rollback (first half of artifacts)
    if (failureSeverity >= 40) {
      const partial = affectedArtifacts.slice(0, Math.ceil(affectedArtifacts.length / 2));
      return {
        scope: 'partial',
        targetArtifacts: partial,
        confidence: 0.6,
        reason: `Moderate severity (${failureSeverity}), rolling back ${partial.length} of ${affectedArtifacts.length} artifacts`,
      };
    }

    return { scope: 'none', targetArtifacts: [], confidence: 0.5, reason: 'Low severity, no rollback needed' };
  }
}
