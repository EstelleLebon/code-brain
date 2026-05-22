"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RuntimeSignalCollector_js_1 = require("../runtime-awareness/RuntimeSignalCollector.js");
const OutcomeClassifier_js_1 = require("../outcomes/OutcomeClassifier.js");
const OutcomeAnalyzer_js_1 = require("../outcomes/OutcomeAnalyzer.js");
const OutcomeCorrelation_js_1 = require("../outcomes/OutcomeCorrelation.js");
(0, node_test_1.describe)('OutcomeClassifier', () => {
    const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'test' });
    const clf = new OutcomeClassifier_js_1.OutcomeClassifier();
    (0, node_test_1.it)('empty signals → success', () => {
        strict_1.default.equal(clf.classify([]).outcome, 'success');
    });
    (0, node_test_1.it)('build failure → regression', () => {
        const signals = [col.collect('build', 'failure'), col.collect('test', 'success')];
        strict_1.default.equal(clf.classify(signals).outcome, 'regression');
    });
    (0, node_test_1.it)('test + build failures → failure', () => {
        const signals = [col.collect('build', 'failure'), col.collect('test', 'failure')];
        strict_1.default.equal(clf.classify(signals).outcome, 'failure');
    });
    (0, node_test_1.it)('only warnings → partial_success', () => {
        const signals = [col.collect('lint', 'warning')];
        strict_1.default.equal(clf.classify(signals).outcome, 'partial_success');
    });
    (0, node_test_1.it)('all success → success', () => {
        const signals = [col.collect('test', 'success'), col.collect('build', 'success')];
        strict_1.default.equal(clf.classify(signals).outcome, 'success');
    });
});
(0, node_test_1.describe)('OutcomeAnalyzer', () => {
    (0, node_test_1.it)('records correlation after each analysis', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        const analyzer = new OutcomeAnalyzer_js_1.OutcomeAnalyzer();
        const signals = [col.collect('test', 'success')];
        analyzer.analyze('op-1', 'rename_symbol', signals);
        analyzer.analyze('op-2', 'rename_symbol', signals);
        const corr = analyzer.correlation.correlate('rename_symbol');
        strict_1.default.equal(corr.totalCount, 2);
        strict_1.default.equal(corr.successRate, 1);
    });
    (0, node_test_1.it)('riskObserved is 0 for passing signals', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        const analyzer = new OutcomeAnalyzer_js_1.OutcomeAnalyzer();
        const outcome = analyzer.analyze('op-1', 'rename_symbol', [col.collect('build', 'success')]);
        strict_1.default.equal(outcome.riskObserved, 0);
    });
});
(0, node_test_1.describe)('OutcomeCorrelation', () => {
    (0, node_test_1.it)('failure rate calculation', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        const clf = new OutcomeClassifier_js_1.OutcomeClassifier();
        const corr = new OutcomeCorrelation_js_1.OutcomeCorrelation();
        const fail = [col.collect('build', 'failure')];
        const pass = [col.collect('build', 'success')];
        const makeOutcome = (signals) => ({
            id: 'x',
            operationId: 'x',
            outcome: clf.classify(signals).outcome,
            signals,
            riskObserved: 0,
            summary: [],
            timestamp: Date.now(),
        });
        corr.record('move_function', makeOutcome(fail));
        corr.record('move_function', makeOutcome(pass));
        const entry = corr.correlate('move_function');
        strict_1.default.equal(entry.failureRate, 0.5);
        strict_1.default.equal(entry.totalCount, 2);
    });
});
//# sourceMappingURL=outcomes.test.js.map