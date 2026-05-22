import { ConstraintViolation } from './ConstraintEngine.js';

export interface Invariant {
  name: string;
  description: string;
  check: (filePath: string, imports: string[]) => boolean;
}

interface PatternRule {
  name: string;
  forbiddenPattern: RegExp;
  applyToPath: RegExp;
}

export class ArchitecturalInvariantChecker {
  private invariants: Invariant[] = [];
  private patternRules: PatternRule[] = [];

  addInvariant(invariant: Invariant): void {
    this.invariants.push(invariant);
  }

  check(filePath: string, imports: string[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const invariant of this.invariants) {
      if (!invariant.check(filePath, imports)) {
        violations.push({
          constraint: invariant.name,
          severity: 'error',
          message: `Architectural invariant violated: ${invariant.description} in ${filePath}`,
        });
      }
    }

    for (const rule of this.patternRules) {
      if (!rule.applyToPath.test(filePath)) continue;
      for (const imp of imports) {
        if (rule.forbiddenPattern.test(imp)) {
          violations.push({
            constraint: rule.name,
            severity: 'error',
            message: `Forbidden import pattern "${rule.forbiddenPattern}" matched "${imp}" in ${filePath}`,
          });
        }
      }
    }

    return violations;
  }

  addPatternRule(name: string, forbiddenPattern: RegExp, applyToPath: RegExp): void {
    this.patternRules.push({ name, forbiddenPattern, applyToPath });
  }
}
