"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const FaultInjection_js_1 = require("../stress-testing/FaultInjection.js");
function scenario(overrides = {}) {
    return {
        id: 'test',
        faultType: 'random_failure',
        probability: 1.0,
        ...overrides,
    };
}
(0, node_test_1.describe)('FaultInjector', () => {
    let injector;
    (0, node_test_1.beforeEach)(() => {
        injector = new FaultInjection_js_1.FaultInjector(42);
    });
    (0, node_test_1.it)('injects a fault and returns it', () => {
        const fault = injector.inject(scenario());
        strict_1.default.ok(fault.id);
        strict_1.default.equal(fault.triggerCount, 0);
        strict_1.default.ok(fault.injectedAt instanceof Date);
    });
    (0, node_test_1.it)('activeFaults returns injected faults', () => {
        injector.inject(scenario());
        injector.inject(scenario({ faultType: 'trust_drift' }));
        strict_1.default.equal(injector.activeFaults().length, 2);
    });
    (0, node_test_1.it)('clear removes a fault', () => {
        const fault = injector.inject(scenario());
        const ok = injector.clear(fault.id);
        strict_1.default.ok(ok);
        strict_1.default.equal(injector.activeFaults().length, 0);
    });
    (0, node_test_1.it)('clearAll removes all faults', () => {
        injector.inject(scenario());
        injector.inject(scenario({ faultType: 'event_loss' }));
        injector.clearAll();
        strict_1.default.equal(injector.activeFaults().length, 0);
    });
    (0, node_test_1.it)('shouldTrigger returns false when no faults active', () => {
        const result = injector.shouldTrigger('random_failure');
        strict_1.default.equal(result.triggered, false);
    });
    (0, node_test_1.it)('shouldTrigger returns true with probability=1', () => {
        injector.inject(scenario({ probability: 1.0 }));
        const result = injector.shouldTrigger('random_failure');
        strict_1.default.equal(result.triggered, true);
        strict_1.default.ok(result.fault);
    });
    (0, node_test_1.it)('shouldTrigger increments triggerCount', () => {
        const fault = injector.inject(scenario({ probability: 1.0 }));
        injector.shouldTrigger('random_failure');
        injector.shouldTrigger('random_failure');
        strict_1.default.equal(fault.triggerCount, 2);
    });
    (0, node_test_1.it)('scoped faults only trigger for matching executionId', () => {
        injector.inject(scenario({ executionId: 'exec-A', probability: 1.0 }));
        const forB = injector.shouldTrigger('random_failure', 'exec-B');
        strict_1.default.equal(forB.triggered, false);
        const forA = injector.shouldTrigger('random_failure', 'exec-A');
        strict_1.default.equal(forA.triggered, true);
    });
    (0, node_test_1.it)('global faults trigger for any executionId', () => {
        injector.inject(scenario({ probability: 1.0 }));
        const result = injector.shouldTrigger('random_failure', 'any-exec');
        strict_1.default.equal(result.triggered, true);
    });
    (0, node_test_1.it)('deterministic mode with same seed produces same result', () => {
        const a = new FaultInjection_js_1.FaultInjector(99);
        const b = new FaultInjection_js_1.FaultInjector(99);
        a.inject(scenario({ probability: 0.5 }));
        b.inject(scenario({ probability: 0.5 }));
        const ra = a.shouldTrigger('random_failure');
        const rb = b.shouldTrigger('random_failure');
        strict_1.default.equal(ra.triggered, rb.triggered);
    });
    (0, node_test_1.it)('clear returns false for unknown id', () => {
        const ok = injector.clear('nonexistent');
        strict_1.default.equal(ok, false);
    });
    (0, node_test_1.it)('supports all fault types', () => {
        const types = [
            'runtime_timeout', 'memory_pressure', 'random_failure',
            'corrupted_retrieval', 'trust_drift', 'event_loss',
            'partial_rollback', 'stale_snapshot',
        ];
        for (const type of types) {
            injector.inject(scenario({ faultType: type, probability: 1.0 }));
        }
        strict_1.default.equal(injector.activeFaults().length, types.length);
    });
});
//# sourceMappingURL=fault-injection.test.js.map