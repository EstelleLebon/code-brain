// Schema version and migration tracking
export const SCHEMA_VERSION = 2;

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
];
