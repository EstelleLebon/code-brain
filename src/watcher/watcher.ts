import chokidar from 'chokidar';
import path from 'path';
import { Indexer } from '../indexer/indexer.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { Embedder } from '../embeddings/embedder.js';

export type WatcherEvent = 'add' | 'change' | 'unlink';

export interface WatcherEventData {
  event: WatcherEvent;
  filePath: string;
  timestamp: number;
  changed: boolean;
}

export class Watcher {
  private watcher: chokidar.FSWatcher | null = null;
  private indexer: Indexer;
  private embedder: Embedder;
  private telemetry: Telemetry;
  private handlers: Array<(data: WatcherEventData) => void> = [];
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceMs: number;

  constructor(indexer: Indexer, embedder: Embedder, telemetry: Telemetry, debounceMs = 300) {
    this.indexer = indexer;
    this.embedder = embedder;
    this.telemetry = telemetry;
    this.debounceMs = debounceMs;
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
      this.processFileChange(event, absPath);
    }, this.debounceMs);

    this.debounceTimers.set(absPath, timer);
  }

  private processFileChange(event: WatcherEvent, filePath: string): void {
    this.telemetry.log('info', 'watcher.file_event', { event, filePath });

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
