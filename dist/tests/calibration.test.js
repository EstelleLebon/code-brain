"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ConfidenceCalibration_js_1 = require("../calibration/ConfidenceCalibration.js");
const CalibrationMemory_js_1 = require("../calibration/CalibrationMemory.js");
const RiskCalibration_js_1 = require("../calibration/RiskCalibration.js");
(0, node_test_1.describe)('calibrate', () => {
    (0, node_test_1.it)('accurate when delta is within threshold', () => {
        const r = (0, ConfidenceCalibration_js_1.calibrate)(50, 58);
        strict_1.default.equal(r.direction, 'accurate');
        strict_1.default.equal(r.calibrationDelta, 8);
    });
    (0, node_test_1.it)('underestimated when observed >> predicted', () => {
        const r = (0, ConfidenceCalibration_js_1.calibrate)(20, 80);
        strict_1.default.equal(r.direction, 'underestimated');
    });
    (0, node_test_1.it)('overestimated when observed << predicted', () => {
        const r = (0, ConfidenceCalibration_js_1.calibrate)(80, 20);
        strict_1.default.equal(r.direction, 'overestimated');
    });
});
(0, node_test_1.describe)('CalibrationMemory', () => {
    (0, node_test_1.it)('averageDelta is null for unknown type', () => {
        const mem = new CalibrationMemory_js_1.CalibrationMemory();
        strict_1.default.equal(mem.averageDelta('rename_symbol'), null);
    });
    (0, node_test_1.it)('adjustedRisk returns raw prediction when no history', () => {
        const mem = new CalibrationMemory_js_1.CalibrationMemory();
        strict_1.default.equal(mem.adjustedRisk('rename_symbol', 30), 30);
    });
    (0, node_test_1.it)('adjustedRisk applies average delta', () => {
        const mem = new CalibrationMemory_js_1.CalibrationMemory();
        mem.record('move_function', (0, ConfidenceCalibration_js_1.calibrate)(20, 40));
        mem.record('move_function', (0, ConfidenceCalibration_js_1.calibrate)(30, 50));
        const adjusted = mem.adjustedRisk('move_function', 25);
        strict_1.default.equal(adjusted, 45);
    });
});
(0, node_test_1.describe)('RiskCalibration', () => {
    (0, node_test_1.it)('predict adjusts after observations', () => {
        const rc = new RiskCalibration_js_1.RiskCalibration();
        rc.observe('split_module', 30, 60);
        const predicted = rc.predict('split_module', 30);
        strict_1.default.equal(predicted, 60);
    });
    (0, node_test_1.it)('summary returns correct entry', () => {
        const rc = new RiskCalibration_js_1.RiskCalibration();
        rc.observe('rename_symbol', 10, 15);
        const s = rc.summary();
        strict_1.default.equal(s.length, 1);
        strict_1.default.equal(s[0].operationType, 'rename_symbol');
        strict_1.default.equal(s[0].sampleCount, 1);
    });
});
//# sourceMappingURL=calibration.test.js.map