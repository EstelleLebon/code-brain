import { DB } from '../persistence/db.js';
import { Telemetry } from '../telemetry/telemetry.js';

// Common programming terms as base vocabulary
const BASE_VOCAB_TERMS = [
  'function', 'class', 'interface', 'type', 'variable', 'method', 'property', 'enum',
  'namespace', 'export', 'import', 'return', 'const', 'let', 'var', 'async', 'await',
  'promise', 'array', 'object', 'string', 'number', 'boolean', 'null', 'undefined',
  'void', 'any', 'never', 'unknown', 'readonly', 'private', 'public', 'protected',
  'static', 'abstract', 'extends', 'implements', 'new', 'this', 'super', 'typeof',
  'instanceof', 'keyof', 'infer', 'conditional', 'generic', 'tuple', 'union', 'intersection',
  'index', 'mapped', 'template', 'literal', 'decorator', 'parameter', 'argument',
  'callback', 'event', 'handler', 'listener', 'emitter', 'observer', 'subscribe',
  'publish', 'dispatch', 'action', 'reducer', 'state', 'store', 'model', 'schema',
  'validate', 'parse', 'serialize', 'deserialize', 'transform', 'convert', 'map',
  'filter', 'reduce', 'find', 'sort', 'search', 'query', 'fetch', 'get', 'post',
  'put', 'delete', 'patch', 'request', 'response', 'error', 'exception', 'catch',
  'try', 'throw', 'finally', 'promise', 'resolve', 'reject', 'then', 'catch',
  'database', 'table', 'row', 'column', 'insert', 'update', 'select', 'where',
  'join', 'index', 'transaction', 'commit', 'rollback', 'migration', 'schema',
  'file', 'path', 'read', 'write', 'stream', 'buffer', 'encoding', 'format',
  'config', 'option', 'setting', 'environment', 'process', 'module', 'package',
  'dependency', 'version', 'release', 'build', 'test', 'spec', 'mock', 'stub',
  'assert', 'expect', 'describe', 'it', 'before', 'after', 'setup', 'teardown',
  'component', 'props', 'state', 'render', 'hook', 'effect', 'context', 'ref',
  'node', 'tree', 'graph', 'edge', 'vertex', 'depth', 'breadth', 'traverse',
  'hash', 'set', 'map', 'list', 'queue', 'stack', 'heap', 'cache', 'pool',
  'token', 'auth', 'login', 'logout', 'session', 'cookie', 'header', 'middleware',
  'router', 'route', 'endpoint', 'api', 'rest', 'graphql', 'websocket', 'http',
  'server', 'client', 'socket', 'connection', 'protocol', 'port', 'host', 'url',
  'logger', 'metric', 'trace', 'span', 'event', 'log', 'debug', 'info', 'warn',
  'create', 'update', 'delete', 'load', 'save', 'init', 'start', 'stop', 'run',
  'open', 'close', 'connect', 'disconnect', 'send', 'receive', 'encode', 'decode',
  'compress', 'decompress', 'encrypt', 'decrypt', 'sign', 'verify', 'hash', 'salt',
  'timeout', 'interval', 'delay', 'retry', 'backoff', 'limit', 'throttle', 'debounce',
  'clone', 'copy', 'merge', 'assign', 'freeze', 'seal', 'proxy', 'reflect',
  'symbol', 'iterator', 'generator', 'yield', 'spread', 'rest', 'destructure',
  'optional', 'required', 'default', 'override', 'overload', 'accessor', 'setter',
  'getter', 'constructor', 'destructor', 'factory', 'singleton', 'builder', 'adapter',
  'strategy', 'observer', 'decorator', 'command', 'query', 'repository', 'service',
  'controller', 'provider', 'injector', 'container', 'registry', 'resolver', 'loader',
  'parser', 'lexer', 'tokenize', 'compile', 'transpile', 'evaluate', 'execute', 'run',
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2 && t.length <= 40);
}

export class Embedder {
  private vocabulary: Map<string, number> = new Map();
  private vocabSize: number;
  private db: DB;
  private telemetry: Telemetry;
  private initialized = false;

  constructor(db: DB, telemetry: Telemetry, vocabSize = 512) {
    this.db = db;
    this.telemetry = telemetry;
    this.vocabSize = vocabSize;
  }

  private ensureVocabulary(): void {
    if (this.initialized) return;
    this.buildVocabulary();
    this.initialized = true;
  }

  private buildVocabulary(): void {
    this.vocabulary.clear();

    // Start with base vocab
    for (let i = 0; i < Math.min(BASE_VOCAB_TERMS.length, this.vocabSize); i++) {
      const term = BASE_VOCAB_TERMS[i];
      if (term) this.vocabulary.set(term, i);
    }

    // Augment with terms from indexed chunks
    if (this.vocabulary.size < this.vocabSize) {
      try {
        const chunks = this.db.getAllChunks();
        const termFreq = new Map<string, number>();

        for (const chunk of chunks) {
          const tokens = tokenize(chunk.content + ' ' + (chunk.summary ?? ''));
          for (const token of tokens) {
            if (!this.vocabulary.has(token)) {
              termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
            }
          }
        }

        // Add most frequent new terms
        const sorted = Array.from(termFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, this.vocabSize - this.vocabulary.size);

        for (const [term] of sorted) {
          this.vocabulary.set(term, this.vocabulary.size);
          if (this.vocabulary.size >= this.vocabSize) break;
        }
      } catch {
        // DB might not have chunks yet
      }
    }
  }

  rebuildVocabulary(): void {
    this.initialized = false;
    this.ensureVocabulary();
  }

  embed(text: string): Float32Array {
    this.ensureVocabulary();

    const tokens = tokenize(text);
    const vec = new Float32Array(this.vocabSize);

    // Term frequency
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const totalTokens = tokens.length || 1;

    for (const [term, freq] of tf.entries()) {
      const idx = this.vocabulary.get(term);
      if (idx !== undefined) {
        vec[idx] = freq / totalTokens;
      }
    }

    // Normalize to unit vector
    let magnitude = 0;
    for (let i = 0; i < vec.length; i++) {
      magnitude += vec[i]! * vec[i]!;
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i]! /= magnitude;
      }
    }

    return vec;
  }

  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      magA += a[i]! * a[i]!;
      magB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  computeAndStore(chunkId: string, text: string): Float32Array {
    const vec = this.embed(text);
    this.db.insertEmbedding(chunkId, vec);
    this.telemetry.metric('embedding.computed', 1, { chunkId });
    return vec;
  }

  computeAndStoreBatch(items: Array<{ chunkId: string; text: string }>): void {
    const embeddings = items.map(item => ({
      chunkId: item.chunkId,
      vector: this.embed(item.text),
    }));
    this.db.insertEmbeddingsBatch(embeddings);
    this.telemetry.metric('embedding.batch', items.length);
  }

  findSimilar(
    queryVec: Float32Array,
    limit: number
  ): Array<{ chunkId: string; similarity: number }> {
    const stored = this.db.getAllEmbeddings();
    const results = stored.map(({ chunkId, vector }) => ({
      chunkId,
      similarity: this.cosineSimilarity(queryVec, vector),
    }));

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }
}
