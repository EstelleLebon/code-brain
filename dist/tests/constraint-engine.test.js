"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ConstraintEngine_js_1 = require("../constraints/ConstraintEngine.js");
const ArchitecturalInvariant_js_1 = require("../constraints/ArchitecturalInvariant.js");
const PlanGenerator_js_1 = require("../planning/PlanGenerator.js");
function makeGoal(overrides = {}) {
    return {
        id: 'g1',
        description: 'Test goal',
        type: 'refactor',
        priority: 'medium',
        constraints: { maxRisk: 40 },
        acceptanceCriteria: [],
        createdAt: new Date(),
        status: 'pending',
        ...overrides,
    };
}
(0, node_test_1.describe)('ConstraintEngine', () => {
    (0, node_test_1.test)('no violations on valid plan', () => {
        const engine = new ConstraintEngine_js_1.ConstraintEngine();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal({ constraints: { maxRisk: 1000 } });
        const plan = generator.generate([goal]);
        const violations = engine.evaluate(plan, { maxRisk: 1000 });
        strict_1.default.equal(violations.filter(v => v.severity === 'error').length, 0);
    });
    (0, node_test_1.test)('detects risk budget violation', () => {
        const engine = new ConstraintEngine_js_1.ConstraintEngine();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal({ constraints: { maxRisk: 100 } });
        const plan = generator.generate([goal]);
        // Force violation by setting maxRisk very low
        const violations = engine.evaluate(plan, { maxRisk: 1 });
        strict_1.default.ok(violations.some(v => v.constraint === 'maxRisk' && v.severity === 'error'));
    });
    (0, node_test_1.test)('detects forbidden path violation', () => {
        const engine = new ConstraintEngine_js_1.ConstraintEngine();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal({ description: 'Touch /etc/passwd file' });
        const plan = generator.generate([goal]);
        const violations = engine.evaluate(plan, { forbiddenPaths: ['/etc/passwd'] });
        strict_1.default.ok(violations.some(v => v.constraint === 'forbiddenPaths'));
    });
    (0, node_test_1.test)('isValid returns false on error violations', () => {
        const engine = new ConstraintEngine_js_1.ConstraintEngine();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const plan = generator.generate([makeGoal()]);
        strict_1.default.equal(engine.isValid(plan, { maxRisk: 1 }), false);
    });
    (0, node_test_1.test)('isValid returns true when only warnings', () => {
        const engine = new ConstraintEngine_js_1.ConstraintEngine();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        // Use large maxRisk so no error, but small runtimeBudgetMs for a warning
        const goal = makeGoal({ constraints: { maxRisk: 10000 } });
        const plan = generator.generate([goal]);
        const result = engine.isValid(plan, { maxRisk: 10000, runtimeBudgetMs: 1 });
        // Should be valid (only warning)
        strict_1.default.equal(result, true);
    });
    (0, node_test_1.test)('detects mutationBudget violation', () => {
        const engine = new ConstraintEngine_js_1.ConstraintEngine();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal();
        const plan = generator.generate([goal]);
        const violations = engine.evaluate(plan, { mutationBudget: 0 });
        strict_1.default.ok(violations.some(v => v.constraint === 'mutationBudget'));
    });
});
(0, node_test_1.describe)('ArchitecturalInvariantChecker', () => {
    (0, node_test_1.test)('passes when invariant holds', () => {
        const checker = new ArchitecturalInvariant_js_1.ArchitecturalInvariantChecker();
        checker.addInvariant({
            name: 'no-circular',
            description: 'No module imports itself',
            check: (filePath, imports) => !imports.includes(filePath),
        });
        const violations = checker.check('src/foo.ts', ['src/bar.ts']);
        strict_1.default.equal(violations.length, 0);
    });
    (0, node_test_1.test)('fails when invariant violated', () => {
        const checker = new ArchitecturalInvariant_js_1.ArchitecturalInvariantChecker();
        checker.addInvariant({
            name: 'no-circular',
            description: 'No module imports itself',
            check: (filePath, imports) => !imports.includes(filePath),
        });
        const violations = checker.check('src/foo.ts', ['src/foo.ts']);
        strict_1.default.equal(violations.length, 1);
        strict_1.default.equal(violations[0].constraint, 'no-circular');
    });
    (0, node_test_1.test)('pattern rule detects forbidden import', () => {
        const checker = new ArchitecturalInvariant_js_1.ArchitecturalInvariantChecker();
        checker.addPatternRule('no-fs-in-api', /^node:fs/, /src\/api\//);
        const violations = checker.check('src/api/api.ts', ['node:fs', 'node:path']);
        strict_1.default.ok(violations.some(v => v.constraint === 'no-fs-in-api'));
    });
    (0, node_test_1.test)('pattern rule does not fire outside target path', () => {
        const checker = new ArchitecturalInvariant_js_1.ArchitecturalInvariantChecker();
        checker.addPatternRule('no-fs-in-api', /^node:fs/, /src\/api\//);
        const violations = checker.check('src/utils/helper.ts', ['node:fs']);
        strict_1.default.equal(violations.length, 0);
    });
});
//# sourceMappingURL=constraint-engine.test.js.map