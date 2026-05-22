import chokidar from 'chokidar';
import path from 'path';
import { Indexer } from '../indexer/indexer.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { Embedder } from '../embeddings/embedder.js';
import { InvalidationEngine, InvalidationEvent } from '../invalidation/InvalidationEngine.js';
import { TransactionCoordinator } from '../transactions/TransactionCoordinator.js';
import { CognitiveUpdateResult } from '../types/index.js';

export type WatcherEvent = 'add' | 'change' | 'unlink';

export interface WatcherEventData {
  event: WatcherEvent;
  filePath: string;
  timestamp: number;
  changed: boolean;
  cognitiveUpdate?: CognitiveUpdateResult;
}

export interface WatcherOptions {
  invalidationEngine?: InvalidationEngine;
  transactionCoordinator?: TransactionCoordinator;
}

export class Watcher {
  private watcher: chokidar.FSWatcher | null = null;
  private indexer: Indexer;
  private embedder: Embedder;
  private telemetry: Telemetry;
  private handlers: Array<(data: WatcherEventData) => void> = [];
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceMs: number;
  private invalidationEngine?: InvalidationEngine;
  private transactionCoordinator?: TransactionCoordinator;

  constructor(indexer: Indexer, embedder: Embedder, telemetry: Telemetry, debounceMs = 300, options: WatcherOptions = {}) {
    this.indexer = indexer;
    this.embedder = embedder;
    this.telemetry = telemetry;
    this.debounceMs = debounceMs;
    this.invalidationEngine = options.invalidationEngine;
    this.transactionCoordinator = options.transactionCoordinator;
  }

  start(repoPath: string, glob = '**/*.{ts,tsx}'): void {
    if (this.watcher) {
      this.telemetry.log('warn', 'watcher.already_running', {});
      return;
    }

    const watchPattern = path.join(repoPath, glob);
    this.telemetry.log('info', 'watcher.start', { pattern: watchPattern });

    this.watcher = chokidar.watch(watchPattern, {
      ignored: [
        /node_modules/,
        /\.git/,
        /dist\//,
        /build\//,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath: string) => this.handleFileEvent('add', filePath));
    this.watcher.on('change', (filePath: string) => this.handleFileEvent('change', filePath));
    this.watcher.on('unlink', (filePath: string) => this.handleUnlink(filePath));
    this.watcher.on('error', (err: Error) => {
      this.telemetry.log('error', 'watcher.error', { error: String(err) });
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.telemetry.log('info', 'watcher.stopped', {});
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  onEvent(handler: (data: WatcherEventData) => void): void {
    this.handlers.push(handler);
  }

  private handleFileEvent(event: WatcherEvent, filePath: string): void {
    const absPath = path.resolve(filePath);

    // Debounce
    const existing = this.debounceTimers.get(absPath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(absPath);
      void this.processFileChange(event, absPath);
    }, this.debounceMs);

    this.debounceTimers.set(absPath, timer);
  }

  private async processFileChange(event: WatcherEvent, filePath: string): Promise<void> {
    this.telemetry.log('info', 'watcher.file_event', { event, filePath });

    // If invalidation engine and transaction coordinator are provided, use cognitive update path
    if (this.invalidationEngine && this.transactionCoordinator) {
      await this.processFileChangeWithCognition(event, filePath);
      return;
    }

    // Original path (no invalidation integration)
    try {
      const changed = this.indexer.updateFile(filePath);
      this.embedder.rebuildVocabulary();

      const data: WatcherEventData = {
        event,
        filePath,
        timestamp: Date.now(),
        changed,
      };

      this.telemetry.metric('watcher.file_processed', 1, { event });
      this.emitEvent(data);
    } catch (err) {
      this.telemetry.log('error', 'watcher.process_error', { filePath, error: String(err) });
    }
  }

  private async processFileChangeWithCognition(event: WatcherEvent, filePath: string): Promise<void> {
    const start = Date.now();

    const txResult = await this.transactionCoordinator!.execute(async (_txn) => {
      // Propagate invalidation
      const invalidationEvent: InvalidationEvent = {
        filePath,
        symbolIds: [],
        timestamp: Date.now(),
        reason: `file_${event}`,
      };
      const invalidationResult = this.invalidationEngine!.propagate(invalidationEvent);

      // Re-index file
      const changed = this.indexer.updateFile(filePath);
      this.embedder.rebuildVocabulary();

      return { invalidationResult, changed };
    });

    const durationMs = Date.now() - start;

    let cognitiveUpdate: CognitiveUpdateResult;
    if (txResult.success && txResult.data) {
      const { invalidationResult } = txResult.data;
      cognitiveUpdate = {
        invalidatedArtifacts:
          invalidationResult.invalidatedSymbols.length +
          invalidationResult.invalidatedClaims.length +
          invalidationResult.invalidatedChunks.length,
        recomputedArtifacts: 1, // the re-indexed file
        propagationDepth: invalidationResult.propagationDepth,
        durationMs,
        committed: true,
        transactionId: txResult.transactionId,
      };
    } else {
      cognitiveUpdate = {
        invalidatedArtifacts: 0,
        recomputedArtifacts: 0,
        propagationDepth: 0,
        durationMs,
        committed: false,
        transactionId: txResult.transactionId,
      };
      this.telemetry.log('error', 'watcher.cognitive_update_failed', {
        filePath,
        error: txResult.error,
      });
    }

    this.telemetry.log('info', 'watcher.cognitive_update', {
      filePath,
      ...cognitiveUpdate,
    });
    this.telemetry.metric('watcher.file_processed', 1, { event });

    const data: WatcherEventData = {
      event,
      filePath,
      timestamp: Date.now(),
      changed: txResult.success && (txResult.data?.changed ?? false),
      cognitiveUpdate,
    };

    this.emitEvent(data);
  }

  private handleUnlink(filePath: string): void {
    const absPath = path.resolve(filePath);
    this.telemetry.log('info', 'watcher.file_deleted', { filePath: absPath });
    // File removed: leave symbols in DB for now (they'll be stale)
    // A more aggressive approach would delete them
    this.emitEvent({
      event: 'unlink',
      filePath: absPath,
      timestamp: Date.now(),
      changed: true,
    });
  }

  private emitEvent(data: WatcherEventData): void {
    for (const handler of this.handlers) {
      try {
        handler(data);
      } catch (err) {
        this.telemetry.log('error', 'watcher.handler_error', { error: String(err) });
      }
    }
  }

  isRunning(): boolean {
    return this.watcher !== null;
  }
}
