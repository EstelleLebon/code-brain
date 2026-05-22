import { ConstraintViolation } from './ConstraintEngine.js';
export interface Invariant {
    name: string;
    description: string;
    check: (filePath: string, imports: string[]) => boolean;
}
export declare class ArchitecturalInvariantChecker {
    private invariants;
    private patternRules;
    addInvariant(invariant: Invariant): void;
    check(filePath: string, imports: string[]): ConstraintViolation[];
    addPatternRule(name: string, forbiddenPattern: RegExp, applyToPath: RegExp): void;
}
//# sourceMappingURL=ArchitecturalInvariant.d.ts.map