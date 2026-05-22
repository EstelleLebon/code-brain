// Schema version and migration tracking
export const SCHEMA_VERSION = 4;

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    indexed_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    file_path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    signature TEXT,
    exported INTEGER NOT NULL DEFAULT 0,
    hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
  CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_path);
  CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);

  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    symbol_id TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    hash TEXT NOT NULL,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_chunks_symbol ON chunks(symbol_id);

  CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id TEXT PRIMARY KEY,
    vector BLOB NOT NULL,
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS edges (
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    PRIMARY KEY (from_id, to_id, kind),
    FOREIGN KEY (from_id) REFERENCES symbols(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
  CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id);

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    symbol_id TEXT NOT NULL,
    claim TEXT NOT NULL,
    confidence REAL NOT NULL,
    source_hash TEXT NOT NULL,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_claims_symbol ON claims(symbol_id);

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  // Version 1: initial schema (handled by CREATE TABLE IF NOT EXISTS)
  { version: 1, sql: '' },
  // Version 2: add truth_level to claims and chunks
  {
    version: 2,
    sql: `
      ALTER TABLE claims ADD COLUMN truth_level INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE chunks ADD COLUMN truth_level INTEGER NOT NULL DEFAULT 0;
    `,
  },
  // Version 3: add versioning columns to chunks and claims
  {
    version: 3,
    sql: `
      ALTER TABLE chunks ADD COLUMN version INTEGER DEFAULT 1;
      ALTER TABLE chunks ADD COLUMN invalidated_at INTEGER;
      ALTER TABLE chunks ADD COLUMN derived_from TEXT;
      ALTER TABLE claims ADD COLUMN version INTEGER DEFAULT 1;
      ALTER TABLE claims ADD COLUMN invalidated_at INTEGER;
      ALTER TABLE claims ADD COLUMN derived_from TEXT;
    `,
  },
  // Version 4: persistent replay logs, sessions, failure patterns, calibration records
  {
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS replay_events (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_replay_events_op ON replay_events(operation_id);
      CREATE INDEX IF NOT EXISTS idx_replay_events_ts ON replay_events(timestamp);

      CREATE TABLE IF NOT EXISTS semantic_replay_events (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        transformation_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_semantic_replay_op ON semantic_replay_events(operation_id);

      CREATE TABLE IF NOT EXISTS runtime_replay_events (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        outcome_id TEXT,
        caused_rollback INTEGER NOT NULL DEFAULT 0,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_runtime_replay_op ON runtime_replay_events(operation_id);

      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        last_access INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_access ON sessions(last_access);

      CREATE TABLE IF NOT EXISTS failure_patterns (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        structural_context TEXT NOT NULL,
        runtime_consequences TEXT NOT NULL,
        frequency INTEGER NOT NULL DEFAULT 1,
        severity REAL NOT NULL DEFAULT 0.5,
        last_seen INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_failure_patterns_type ON failure_patterns(operation_type);

      CREATE TABLE IF NOT EXISTS calibration_records (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        predicted_risk REAL NOT NULL,
        observed_risk REAL NOT NULL,
        calibration_delta REAL NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_calibration_type ON calibration_records(operation_type);
      CREATE INDEX IF NOT EXISTS idx_calibration_ts ON calibration_records(timestamp);
    `,
  },
];
