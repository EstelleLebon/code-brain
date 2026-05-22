"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const StabilityAnalyzer_js_1 = require("../reliability/StabilityAnalyzer.js");
(0, node_test_1.describe)('StabilityAnalyzer', () => {
    let analyzer;
    (0, node_test_1.beforeEach)(() => {
        analyzer = new StabilityAnalyzer_js_1.StabilityAnalyzer();
    });
    (0, node_test_1.it)('analyze returns all required fields', () => {
        const report = analyzer.analyze();
        strict_1.default.ok(typeof report.trustOscillation === 'number');
        strict_1.default.ok(typeof report.planningEntropy === 'number');
        strict_1.default.ok(typeof report.retrievalDrift === 'number');
        strict_1.default.ok(typeof report.replanFrequency === 'number');
        strict_1.default.ok(typeof report.regressionDetected === 'boolean');
        strict_1.default.ok(typeof report.instabilityDetected === 'boolean');
        strict_1.default.ok(Array.isArray(report.notes));
    });
    (0, node_test_1.it)('stable data produces no instability', () => {
        for (let i = 0; i < 8; i++) {
            analyzer.recordTrust(0.9);
            analyzer.recordPlanningOutcome(0.9);
            analyzer.recordRetrievalQuality(0.9);
            analyzer.recordExecution();
        }
        const report = analyzer.analyze();
        strict_1.default.equal(report.instabilityDetected, false);
        strict_1.default.equal(report.trustOscillation < 0.1, true);
    });
    (0, node_test_1.it)('high trust oscillation triggers instability note', () => {
        for (let i = 0; i < 6; i++) {
            analyzer.recordTrust(i % 2 === 0 ? 0.1 : 0.9);
        }
        analyzer.recordRetrievalQuality(0.0);
        const report = analyzer.analyze();
        strict_1.default.ok(report.trustOscillation > 0.3);
        strict_1.default.ok(report.notes.some(n => n.includes('trust')));
    });
    (0, node_test_1.it)('detectRegression returns true when trust drops', () => {
        // Older high trust
        for (let i = 0; i < 4; i++)
            analyzer.recordTrust(0.9);
        // Recent low trust
        for (let i = 0; i < 4; i++)
            analyzer.recordTrust(0.5);
        strict_1.default.equal(analyzer.detectRegression(), true);
    });
    (0, node_test_1.it)('detectRegression returns false with stable trust', () => {
        for (let i = 0; i < 8; i++)
            analyzer.recordTrust(0.85);
        strict_1.default.equal(analyzer.detectRegression(), false);
    });
    (0, node_test_1.it)('high replan frequency triggers note', () => {
        for (let i = 0; i < 10; i++)
            analyzer.recordReplan();
        analyzer.recordTrust(0.1);
        analyzer.recordRetrievalQuality(0.1);
        analyzer.recordExecution();
        const report = analyzer.analyze();
        strict_1.default.ok(report.replanFrequency > 3);
    });
    (0, node_test_1.it)('reset clears all data', () => {
        analyzer.recordTrust(0.1);
        analyzer.recordReplan();
        analyzer.recordExecution();
        analyzer.reset();
        const report = analyzer.analyze();
        strict_1.default.equal(report.trustOscillation, 0);
        strict_1.default.equal(report.replanFrequency, 0);
    });
    (0, node_test_1.it)('detectInstability delegates to analyze()', () => {
        for (let i = 0; i < 6; i++)
            analyzer.recordTrust(i % 2 === 0 ? 0.0 : 1.0);
        for (let i = 0; i < 6; i++)
            analyzer.recordPlanningOutcome(i % 2 === 0 ? 0.0 : 1.0);
        analyzer.recordRetrievalQuality(0.0);
        const unstable = analyzer.detectInstability();
        strict_1.default.equal(typeof unstable, 'boolean');
    });
});
//# sourceMappingURL=stability-analyzer.test.js.map