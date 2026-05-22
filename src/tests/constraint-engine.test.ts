import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ConstraintEngine } from '../constraints/ConstraintEngine.js';
import { ArchitecturalInvariantChecker } from '../constraints/ArchitecturalInvariant.js';
import { PlanGenerator } from '../planning/PlanGenerator.js';
import { Goal } from '../goals/Goal.js';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
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

describe('ConstraintEngine', () => {
  test('no violations on valid plan', () => {
    const engine = new ConstraintEngine();
    const generator = new PlanGenerator();
    const goal = makeGoal({ constraints: { maxRisk: 1000 } });
    const plan = generator.generate([goal]);
    const violations = engine.evaluate(plan, { maxRisk: 1000 });
    assert.equal(violations.filter(v => v.severity === 'error').length, 0);
  });

  test('detects risk budget violation', () => {
    const engine = new ConstraintEngine();
    const generator = new PlanGenerator();
    const goal = makeGoal({ constraints: { maxRisk: 100 } });
    const plan = generator.generate([goal]);
    // Force violation by setting maxRisk very low
    const violations = engine.evaluate(plan, { maxRisk: 1 });
    assert.ok(violations.some(v => v.constraint === 'maxRisk' && v.severity === 'error'));
  });

  test('detects forbidden path violation', () => {
    const engine = new ConstraintEngine();
    const generator = new PlanGenerator();
    const goal = makeGoal({ description: 'Touch /etc/passwd file' });
    const plan = generator.generate([goal]);
    const violations = engine.evaluate(plan, { forbiddenPaths: ['/etc/passwd'] });
    assert.ok(violations.some(v => v.constraint === 'forbiddenPaths'));
  });

  test('isValid returns false on error violations', () => {
    const engine = new ConstraintEngine();
    const generator = new PlanGenerator();
    const plan = generator.generate([makeGoal()]);
    assert.equal(engine.isValid(plan, { maxRisk: 1 }), false);
  });

  test('isValid returns true when only warnings', () => {
    const engine = new ConstraintEngine();
    const generator = new PlanGenerator();
    // Use large maxRisk so no error, but small runtimeBudgetMs for a warning
    const goal = makeGoal({ constraints: { maxRisk: 10000 } });
    const plan = generator.generate([goal]);
    const result = engine.isValid(plan, { maxRisk: 10000, runtimeBudgetMs: 1 });
    // Should be valid (only warning)
    assert.equal(result, true);
  });

  test('detects mutationBudget violation', () => {
    const engine = new ConstraintEngine();
    const generator = new PlanGenerator();
    const goal = makeGoal();
    const plan = generator.generate([goal]);
    const violations = engine.evaluate(plan, { mutationBudget: 0 });
    assert.ok(violations.some(v => v.constraint === 'mutationBudget'));
  });
});

describe('ArchitecturalInvariantChecker', () => {
  test('passes when invariant holds', () => {
    const checker = new ArchitecturalInvariantChecker();
    checker.addInvariant({
      name: 'no-circular',
      description: 'No module imports itself',
      check: (filePath, imports) => !imports.includes(filePath),
    });
    const violations = checker.check('src/foo.ts', ['src/bar.ts']);
    assert.equal(violations.length, 0);
  });

  test('fails when invariant violated', () => {
    const checker = new ArchitecturalInvariantChecker();
    checker.addInvariant({
      name: 'no-circular',
      description: 'No module imports itself',
      check: (filePath, imports) => !imports.includes(filePath),
    });
    const violations = checker.check('src/foo.ts', ['src/foo.ts']);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].constraint, 'no-circular');
  });

  test('pattern rule detects forbidden import', () => {
    const checker = new ArchitecturalInvariantChecker();
    checker.addPatternRule('no-fs-in-api', /^node:fs/, /src\/api\//);
    const violations = checker.check('src/api/api.ts', ['node:fs', 'node:path']);
    assert.ok(violations.some(v => v.constraint === 'no-fs-in-api'));
  });

  test('pattern rule does not fire outside target path', () => {
    const checker = new ArchitecturalInvariantChecker();
    checker.addPatternRule('no-fs-in-api', /^node:fs/, /src\/api\//);
    const violations = checker.check('src/utils/helper.ts', ['node:fs']);
    assert.equal(violations.length, 0);
  });
});
