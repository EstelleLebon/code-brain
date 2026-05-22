"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitecturalInvariantChecker = void 0;
class ArchitecturalInvariantChecker {
    invariants = [];
    patternRules = [];
    addInvariant(invariant) {
        this.invariants.push(invariant);
    }
    check(filePath, imports) {
        const violations = [];
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
            if (!rule.applyToPath.test(filePath))
                continue;
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
    addPatternRule(name, forbiddenPattern, applyToPath) {
        this.patternRules.push({ name, forbiddenPattern, applyToPath });
    }
}
exports.ArchitecturalInvariantChecker = ArchitecturalInvariantChecker;
//# sourceMappingURL=ArchitecturalInvariant.js.map