import { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import { OutcomeStatus } from './ExecutionOutcome.js';

export class OutcomeClassifier {
  classify(signals: RuntimeSignal[]): { outcome: OutcomeStatus; summary: string[] } {
    if (signals.length === 0) {
      return { outcome: 'success', summary: ['No signals — assumed stable'] };
    }

    const failures = signals.filter(s => s.status === 'failure');
    const warnings = signals.filter(s => s.status === 'warning');
    const summary: string[] = [];

    const testFailures = failures.filter(s => s.signalType === 'test');
    const buildFailures = failures.filter(s => s.signalType === 'build');
    const typecheckFailures = failures.filter(s => s.signalType === 'typecheck');

    if (buildFailures.length > 0) {
      summary.push(`Build failed (${buildFailures.length} signal(s))`);
    }
    if (typecheckFailures.length > 0) {
      summary.push(`Type errors detected (${typecheckFailures.length} signal(s))`);
    }
    if (testFailures.length > 0) {
      summary.push(`${testFailures.length} test failure(s)`);
    }
    if (warnings.length > 0) {
      summary.push(`${warnings.length} warning(s)`);
    }

    const criticalFailures = buildFailures.length + typecheckFailures.length;
    if (criticalFailures > 0 && testFailures.length > 0) {
      return { outcome: 'failure', summary };
    }
    if (criticalFailures > 0) {
      return { outcome: 'regression', summary };
    }
    if (testFailures.length > 0) {
      return { outcome: 'regression', summary };
    }
    if (warnings.length > 0) {
      summary.push('All checks pass with warnings');
      return { outcome: 'partial_success', summary };
    }

    summary.push('All signals pass');
    return { outcome: 'success', summary };
  }
}
