"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ModeSelector_js_1 = require("../cognitive-modes/ModeSelector.js");
const CognitiveMode_js_1 = require("../cognitive-modes/CognitiveMode.js");
const ExecutionStrategy_js_1 = require("../cognitive-modes/ExecutionStrategy.js");
(0, node_test_1.describe)('ModeSelector', () => {
    const selector = new ModeSelector_js_1.ModeSelector();
    (0, node_test_1.test)('hotfix always selects HOTFIX', () => {
        const mode = selector.select({
            calibratedRisk: 'low',
            recentFailures: 0,
            recentSuccesses: 10,
            runtimeInstability: false,
            retrievalConfidence: 0.9,
            isHotfix: true,
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.HOTFIX);
    });
    (0, node_test_1.test)('selects RECOVERY with 3+ failures', () => {
        const mode = selector.select({
            calibratedRisk: 'low',
            recentFailures: 3,
            recentSuccesses: 0,
            runtimeInstability: false,
            retrievalConfidence: 0.5,
            isHotfix: false,
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.RECOVERY);
    });
    (0, node_test_1.test)('selects RECOVERY with runtime instability + 1 failure', () => {
        const mode = selector.select({
            calibratedRisk: 'low',
            recentFailures: 1,
            recentSuccesses: 0,
            runtimeInstability: true,
            retrievalConfidence: 0.5,
            isHotfix: false,
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.RECOVERY);
    });
    (0, node_test_1.test)('selects LEARNING when trend is degrading', () => {
        const mode = selector.select({
            calibratedRisk: 'low',
            recentFailures: 0,
            recentSuccesses: 2,
            runtimeInstability: false,
            retrievalConfidence: 0.6,
            isHotfix: false,
            learningSignal: {
                totalObservations: 10,
                successCount: 4,
                failureCount: 6,
                successRate: 0.4,
                dominantSignal: 'failure',
                recentTrend: 'degrading',
                operationTypeStats: new Map(),
            },
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.LEARNING);
    });
    (0, node_test_1.test)('selects SAFE_REFACTOR for high risk', () => {
        const mode = selector.select({
            calibratedRisk: 'high',
            recentFailures: 0,
            recentSuccesses: 2,
            runtimeInstability: false,
            retrievalConfidence: 0.8,
            isHotfix: false,
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.SAFE_REFACTOR);
    });
    (0, node_test_1.test)('selects AGGRESSIVE_OPTIMIZATION in stable zone', () => {
        const mode = selector.select({
            calibratedRisk: 'low',
            recentFailures: 0,
            recentSuccesses: 5,
            runtimeInstability: false,
            retrievalConfidence: 0.8,
            isHotfix: false,
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.AGGRESSIVE_OPTIMIZATION);
    });
    (0, node_test_1.test)('selects EXPLORATION with low retrieval confidence', () => {
        const mode = selector.select({
            calibratedRisk: 'low',
            recentFailures: 0,
            recentSuccesses: 2,
            runtimeInstability: false,
            retrievalConfidence: 0.2,
            isHotfix: false,
        });
        strict_1.default.equal(mode, CognitiveMode_js_1.CognitiveMode.EXPLORATION);
    });
    (0, node_test_1.test)('selectWithStrategy returns mode and matching strategy', () => {
        const { mode, strategy } = selector.selectWithStrategy({
            calibratedRisk: 'low',
            recentFailures: 0,
            recentSuccesses: 0,
            runtimeInstability: false,
            retrievalConfidence: 0.5,
            isHotfix: false,
        });
        strict_1.default.equal(strategy.mode, mode);
    });
});
(0, node_test_1.describe)('ExecutionStrategy', () => {
    (0, node_test_1.test)('all modes have defined strategies', () => {
        for (const mode of Object.values(CognitiveMode_js_1.CognitiveMode)) {
            const strategy = (0, ExecutionStrategy_js_1.getStrategy)(mode);
            strict_1.default.ok(strategy, `Missing strategy for ${mode}`);
            strict_1.default.equal(strategy.mode, mode);
            strict_1.default.ok(strategy.maxMutations > 0);
        }
    });
    (0, node_test_1.test)('RECOVERY is the most restrictive mode', () => {
        const recovery = ExecutionStrategy_js_1.STRATEGIES[CognitiveMode_js_1.CognitiveMode.RECOVERY];
        strict_1.default.equal(recovery.maxMutations, 1);
        strict_1.default.equal(recovery.rollbackAggressiveness, 'immediate');
        strict_1.default.equal(recovery.retrievalStrictness, 'strict');
        strict_1.default.equal(recovery.validationDepth, 'full');
    });
    (0, node_test_1.test)('AGGRESSIVE_OPTIMIZATION allows highest mutation count', () => {
        const agg = ExecutionStrategy_js_1.STRATEGIES[CognitiveMode_js_1.CognitiveMode.AGGRESSIVE_OPTIMIZATION];
        const allMaxMutations = Object.values(ExecutionStrategy_js_1.STRATEGIES).map(s => s.maxMutations);
        strict_1.default.equal(agg.maxMutations, Math.max(...allMaxMutations));
    });
});
//# sourceMappingURL=cognitive-modes.test.js.map