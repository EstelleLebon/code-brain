"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const AdaptiveTrustPolicy_js_1 = require("../cognitive-loop/AdaptiveTrustPolicy.js");
const TrustPolicy_js_1 = require("../trust/TrustPolicy.js");
(0, node_test_1.describe)('AdaptiveTrustPolicy', () => {
    (0, node_test_1.test)('starts with base policy unchanged', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        const current = policy.currentPolicy();
        strict_1.default.equal(current.maxAutoApproveRisk, TrustPolicy_js_1.DEFAULT_TRUST_POLICY.maxAutoApproveRisk);
        strict_1.default.equal(current.maxReviewRisk, TrustPolicy_js_1.DEFAULT_TRUST_POLICY.maxReviewRisk);
    });
    (0, node_test_1.test)('initial state has confidence 0.5', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy();
        const state = policy.getState();
        strict_1.default.equal(state.confidence, 0.5);
        strict_1.default.equal(state.recentFailures, 0);
        strict_1.default.equal(state.recentSuccesses, 0);
        strict_1.default.equal(state.calibratedRiskDelta, 0);
    });
    (0, node_test_1.test)('becomes conservative after 3+ failures', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        policy.recordFailure();
        policy.recordFailure();
        policy.recordFailure();
        const state = policy.getState();
        strict_1.default.equal(state.calibratedRiskDelta, -1);
        strict_1.default.ok(state.confidence < 0.5);
    });
    (0, node_test_1.test)('conservative policy tightens auto-approve threshold', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        // default: maxAutoApproveRisk = 'low' → after tightening should stay low or become critical (min idx)
        // 'low' is index 0, shifting down stays at 0
        policy.recordFailure();
        policy.recordFailure();
        policy.recordFailure();
        const current = policy.currentPolicy();
        // autoApproveRisk shifted down from 'low' (idx 0) stays 'low'
        strict_1.default.equal(current.maxAutoApproveRisk, 'low');
        // maxReviewRisk = 'high' (idx 2) shifts to 'medium' (idx 1)
        strict_1.default.equal(current.maxReviewRisk, 'medium');
    });
    (0, node_test_1.test)('becomes permissive after 5+ successes with no failures', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        for (let i = 0; i < 5; i++)
            policy.recordSuccess();
        const state = policy.getState();
        strict_1.default.equal(state.calibratedRiskDelta, 1);
        strict_1.default.ok(state.confidence > 0.8);
    });
    (0, node_test_1.test)('permissive policy loosens thresholds', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        for (let i = 0; i < 5; i++)
            policy.recordSuccess();
        const current = policy.currentPolicy();
        // 'low' → 'medium'
        strict_1.default.equal(current.maxAutoApproveRisk, 'medium');
        // 'high' → 'critical'
        strict_1.default.equal(current.maxReviewRisk, 'critical');
    });
    (0, node_test_1.test)('reset returns to initial state', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy();
        policy.recordFailure();
        policy.recordFailure();
        policy.recordFailure();
        policy.reset();
        const state = policy.getState();
        strict_1.default.equal(state.confidence, 0.5);
        strict_1.default.equal(state.calibratedRiskDelta, 0);
    });
    (0, node_test_1.test)('conservative base policy stays conservative when tightened', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy(TrustPolicy_js_1.CONSERVATIVE_TRUST_POLICY);
        policy.recordFailure();
        policy.recordFailure();
        policy.recordFailure();
        const current = policy.currentPolicy();
        strict_1.default.equal(current.name, 'conservative-adaptive');
    });
    (0, node_test_1.test)('mixed signals stay neutral', () => {
        const policy = new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy();
        policy.recordSuccess();
        policy.recordFailure();
        policy.recordSuccess();
        const state = policy.getState();
        strict_1.default.equal(state.calibratedRiskDelta, 0);
    });
});
//# sourceMappingURL=adaptive-trust.test.js.map