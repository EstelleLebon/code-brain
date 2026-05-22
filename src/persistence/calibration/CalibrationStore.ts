import type Database from 'better-sqlite3';

export interface CalibrationRecord {
  id: string;
  operationType: string;
  predictedRisk: number;
  observedRisk: number;
  calibrationDelta: number;
  timestamp: number;
}

interface CalibrationRow {
  id: string;
  operation_type: string;
  predicted_risk: number;
  observed_risk: number;
  calibration_delta: number;
  timestamp: number;
}

/** Persistent store for calibration records — preserves risk learning across restarts. */
export class CalibrationStore {
  constructor(private readonly db: Database.Database) {}

  save(record: CalibrationRecord): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO calibration_records
        (id, operation_type, predicted_risk, observed_risk, calibration_delta, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.operationType,
      record.predictedRisk,
      record.observedRisk,
      record.calibrationDelta,
      record.timestamp,
    );
  }

  loadAll(): CalibrationRecord[] {
    return (this.db.prepare('SELECT * FROM calibration_records ORDER BY timestamp ASC').all() as CalibrationRow[]).map(r => this.deserialize(r));
  }

  loadByOperationType(operationType: string): CalibrationRecord[] {
    return (this.db.prepare('SELECT * FROM calibration_records WHERE operation_type = ? ORDER BY timestamp ASC').all(operationType) as CalibrationRow[]).map(r => this.deserialize(r));
  }

  averageDelta(operationType: string): number | null {
    const row = this.db.prepare('SELECT AVG(calibration_delta) as avg FROM calibration_records WHERE operation_type = ?').get(operationType) as { avg: number | null };
    return row.avg;
  }

  private deserialize(r: CalibrationRow): CalibrationRecord {
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
