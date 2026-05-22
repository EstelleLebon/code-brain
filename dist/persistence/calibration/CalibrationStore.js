"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationStore = void 0;
/** Persistent store for calibration records — preserves risk learning across restarts. */
class CalibrationStore {
    db;
    constructor(db) {
        this.db = db;
    }
    save(record) {
        this.db.prepare(`
      INSERT OR IGNORE INTO calibration_records
        (id, operation_type, predicted_risk, observed_risk, calibration_delta, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(record.id, record.operationType, record.predictedRisk, record.observedRisk, record.calibrationDelta, record.timestamp);
    }
    loadAll() {
        return this.db.prepare('SELECT * FROM calibration_records ORDER BY timestamp ASC').all().map(r => this.deserialize(r));
    }
    loadByOperationType(operationType) {
        return this.db.prepare('SELECT * FROM calibration_records WHERE operation_type = ? ORDER BY timestamp ASC').all(operationType).map(r => this.deserialize(r));
    }
    averageDelta(operationType) {
        const row = this.db.prepare('SELECT AVG(calibration_delta) as avg FROM calibration_records WHERE operation_type = ?').get(operationType);
        return row.avg;
    }
    deserialize(r) {
        return {
            id: r.id,
            operationType: r.operation_type,
            predictedRisk: r.predicted_risk,
            observedRisk: r.observed_risk,
            calibrationDelta: r.calibration_delta,
            timestamp: r.timestamp,
        };
    }
}
exports.CalibrationStore = CalibrationStore;
//# sourceMappingURL=CalibrationStore.js.map