import type Database from 'better-sqlite3';
import type { FailurePattern } from '../../failure-memory/FailurePattern.js';

interface PatternRow {
  id: string;
  operation_type: string;
  structural_context: string;
  runtime_consequences: string;
  frequency: number;
  severity: number;
  last_seen: number;
}

/** Persistent store for FailurePattern — survives restarts. */
export class FailureMemoryStore {
  constructor(private readonly db: Database.Database) {}

  save(pattern: FailurePattern): void {
    this.db.prepare(`
      INSERT INTO failure_patterns (id, operation_type, structural_context, runtime_consequences, frequency, severity, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        frequency = excluded.frequency,
        severity = excluded.severity,
        last_seen = excluded.last_seen,
        structural_context = excluded.structural_context,
        runtime_consequences = excluded.runtime_consequences
    `).run(
      pattern.id,
      pattern.operationType,
      JSON.stringify(pattern.structuralContext),
      JSON.stringify(pattern.runtimeConsequences),
      pattern.frequency,
      pattern.severity,
      pattern.lastSeen,
    );
  }

  loadAll(): FailurePattern[] {
    const rows = this.db.prepare('SELECT * FROM failure_patterns ORDER BY last_seen DESC').all() as PatternRow[];
    return rows.map(r => this.deserialize(r));
  }

  loadByOperationType(operationType: string): FailurePattern[] {
    const rows = this.db.prepare('SELECT * FROM failure_patterns WHERE operation_type = ? ORDER BY last_seen DESC').all(operationType) as PatternRow[];
    return rows.map(r => this.deserialize(r));
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM failure_patterns WHERE id = ?').run(id);
  }

  private deserialize(r: PatternRow): FailurePattern {
    return {
      id: r.id,
      operationType: r.operation_type,
      structuralContext: JSON.parse(r.structural_context),
      runtimeConsequences: JSON.parse(r.runtime_consequences),
      frequency: r.frequency,
      severity: r.severity,
      lastSeen: r.last_seen,
    };
  }
}
