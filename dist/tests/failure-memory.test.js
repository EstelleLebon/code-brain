"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const FailureMemory_js_1 = require("../failure-memory/FailureMemory.js");
(0, node_test_1.describe)('FailureMemory', () => {
    (0, node_test_1.it)('records a new pattern', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        const p = mem.record('split_module', ['circular-deps', 'react-context'], ['3 tests failed'], 7);
        strict_1.default.equal(p.operationType, 'split_module');
        strict_1.default.equal(p.frequency, 1);
        strict_1.default.equal(p.severity, 7);
    });
    (0, node_test_1.it)('increments frequency for similar patterns', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        mem.record('split_module', ['circular-deps'], ['build failed'], 5);
        mem.record('split_module', ['circular-deps'], ['tests failed'], 6);
        const all = mem.all();
        strict_1.default.equal(all.length, 1);
        strict_1.default.equal(all[0].frequency, 2);
        strict_1.default.equal(all[0].severity, 6);
    });
    (0, node_test_1.it)('creates separate pattern for different operation type', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        mem.record('split_module', ['a'], ['x'], 5);
        mem.record('rename_symbol', ['a'], ['y'], 3);
        strict_1.default.equal(mem.all().length, 2);
    });
    (0, node_test_1.it)('search by operation type', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        mem.record('split_module', ['a'], ['x'], 5);
        mem.record('rename_symbol', ['b'], ['y'], 3);
        strict_1.default.equal(mem.search('split_module').length, 1);
    });
    (0, node_test_1.it)('topBySeverity returns sorted results', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        mem.record('split_module', ['a'], ['x'], 9);
        mem.record('rename_symbol', ['b'], ['y'], 3);
        const top = mem.topBySeverity(2);
        strict_1.default.equal(top[0].severity, 9);
    });
});
//# sourceMappingURL=failure-memory.test.js.map