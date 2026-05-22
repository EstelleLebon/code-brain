"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const CognitiveFeedbackLoop_js_1 = require("../cognitive-loop/CognitiveFeedbackLoop.js");
const AdaptiveRetrievalPolicy_js_1 = require("../cognitive-loop/AdaptiveRetrievalPolicy.js");
const LearningSignalAggregator_js_1 = require("../cognitive-loop/LearningSignalAggregator.js");
function makeSuccessResult() {
    return { outcome: 'success', successPatternId: 'p1' };
}
function makeFailureResult() {
    return { outcome: 'failure_learned' };
}
function makeOutcome(status = 'success') {
    return {
        id: `out-${Date.now()}`,
        operationId: 'op1',
        outcome: status,
        signals: [],
        riskObserved: 20,
        summary: [],
        timestamp: Date.now(),
    };
}
(0, node_test_1.describe)('CognitiveFeedbackLoop', () => {
    (0, node_test_1.test)('starts with 0 iterations', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        const summary = loop.summary();
        strict_1.default.equal(summary.loopIterations, 0);
    });
    (0, node_test_1.test)('observe increments iterations', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        loop.observe(makeSuccessResult(), makeOutcome());
        loop.observe(makeSuccessResult(), makeOutcome());
        strict_1.default.equal(loop.summary().loopIterations, 2);
    });
    (0, node_test_1.test)('3 failures → adaptive trust tightens', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        loop.observe(makeFailureResult(), makeOutcome('failure'));
        loop.observe(makeFailureResult(), makeOutcome('failure'));
        loop.observe(makeFailureResult(), makeOutcome('failure'));
        const state = loop.adaptiveTrust.getState();
        strict_1.default.equal(state.calibratedRiskDelta, -1);
    });
    (0, node_test_1.test)('5 successes → adaptive trust loosens', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        for (let i = 0; i < 5; i++)
            loop.observe(makeSuccessResult(), makeOutcome());
        const state = loop.adaptiveTrust.getState();
        strict_1.default.equal(state.calibratedRiskDelta, 1);
    });
    (0, node_test_1.test)('currentTrustPolicy reflects adaptation', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        for (let i = 0; i < 5; i++)
            loop.observe(makeSuccessResult(), makeOutcome());
        const policy = loop.currentTrustPolicy();
        // default maxAutoApproveRisk=low shifted up → medium
        strict_1.default.equal(policy.maxAutoApproveRisk, 'medium');
    });
    (0, node_test_1.test)('observe records chunk reliability for affected chunks', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        loop.observe(makeSuccessResult(), makeOutcome(), ['chunk-1', 'chunk-2']);
        const signal = loop.adaptiveRetrieval.getSignal('chunk-1');
        strict_1.default.ok(signal.successRate > 0.5);
    });
    (0, node_test_1.test)('failure reduces chunk reliability', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        loop.observe(makeFailureResult(), makeOutcome('failure'), ['bad-chunk']);
        const signal = loop.adaptiveRetrieval.getSignal('bad-chunk');
        strict_1.default.ok(signal.failureRate > 0.5);
    });
    (0, node_test_1.test)('aggregated signal reflects success count', () => {
        const loop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        loop.observe(makeSuccessResult(), makeOutcome());
        loop.observe(makeSuccessResult(), makeOutcome());
        loop.observe(makeFailureResult(), makeOutcome('failure'));
        const agg = loop.summary().aggregatedSignal;
        strict_1.default.equal(agg.successCount, 2);
        strict_1.default.equal(agg.failureCount, 1);
    });
});
(0, node_test_1.describe)('AdaptiveRetrievalPolicy', () => {
    (0, node_test_1.test)('unknown chunk returns 0.5 rates', () => {
        const policy = new AdaptiveRetrievalPolicy_js_1.AdaptiveRetrievalPolicy();
        const s = policy.getSignal('unknown');
        strict_1.default.equal(s.successRate, 0.5);
        strict_1.default.equal(s.failureRate, 0.5);
    });
    (0, node_test_1.test)('pure successes builds confidence', () => {
        const policy = new AdaptiveRetrievalPolicy_js_1.AdaptiveRetrievalPolicy();
        for (let i = 0; i < 10; i++)
            policy.recordSuccess('c1');
        const s = policy.getSignal('c1');
        strict_1.default.equal(s.successRate, 1);
        strict_1.default.equal(s.failureRate, 0);
        strict_1.default.ok(s.runtimeConfidence > 0.8);
    });
    (0, node_test_1.test)('rankByReliability sorts best first', () => {
        const policy = new AdaptiveRetrievalPolicy_js_1.AdaptiveRetrievalPolicy();
        for (let i = 0; i < 5; i++)
            policy.recordSuccess('good');
        for (let i = 0; i < 5; i++)
            policy.recordFailure('bad');
        const ranked = policy.rankByReliability(['bad', 'good']);
        strict_1.default.equal(ranked[0], 'good');
    });
});
(0, node_test_1.describe)('LearningSignalAggregator', () => {
    (0, node_test_1.test)('starts empty', () => {
        const agg = new LearningSignalAggregator_js_1.LearningSignalAggregator();
        const sig = agg.aggregate();
        strict_1.default.equal(sig.totalObservations, 0);
        strict_1.default.equal(sig.successRate, 0.5);
    });
    (0, node_test_1.test)('dominantSignal reflects success majority', () => {
        const agg = new LearningSignalAggregator_js_1.LearningSignalAggregator();
        for (let i = 0; i < 7; i++)
            agg.ingest(makeSuccessResult(), makeOutcome());
        for (let i = 0; i < 3; i++)
            agg.ingest(makeFailureResult(), makeOutcome('failure'));
        strict_1.default.equal(agg.aggregate().dominantSignal, 'success');
    });
    (0, node_test_1.test)('recentTrend detects improvement', () => {
        const agg = new LearningSignalAggregator_js_1.LearningSignalAggregator();
        // early: all failures
        for (let i = 0; i < 5; i++)
            agg.ingest(makeFailureResult(), makeOutcome('failure'));
        // late: all successes
        for (let i = 0; i < 5; i++)
            agg.ingest(makeSuccessResult(), makeOutcome());
        strict_1.default.equal(agg.aggregate().recentTrend, 'improving');
    });
    (0, node_test_1.test)('recentTrend detects degradation', () => {
        const agg = new LearningSignalAggregator_js_1.LearningSignalAggregator();
        for (let i = 0; i < 5; i++)
            agg.ingest(makeSuccessResult(), makeOutcome());
        for (let i = 0; i < 5; i++)
            agg.ingest(makeFailureResult(), makeOutcome('failure'));
        strict_1.default.equal(agg.aggregate().recentTrend, 'degrading');
    });
    (0, node_test_1.test)('clear resets aggregator', () => {
        const agg = new LearningSignalAggregator_js_1.LearningSignalAggregator();
        agg.ingest(makeSuccessResult(), makeOutcome());
        agg.clear();
        strict_1.default.equal(agg.aggregate().totalObservations, 0);
    });
});
//# sourceMappingURL=cognitive-loop.test.js.map