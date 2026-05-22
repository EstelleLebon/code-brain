import type Database from 'better-sqlite3';
export interface CalibrationRecord {
    id: string;
    operationType: string;
    predictedRisk: number;
    observedRisk: number;
    calibrationDelta: number;
    timestamp: number;
}
/** Persistent store for calibration records — preserves risk learning across restarts. */
export declare class CalibrationStore {
    private readonly db;
    constructor(db: Database.Database);
    save(record: CalibrationRecord): void;
    loadAll(): CalibrationRecord[];
    loadByOperationType(operationType: string): CalibrationRecord[];
    averageDelta(operationType: string): number | null;
    private deserialize;
}
//# sourceMappingURL=CalibrationStore.d.ts.map