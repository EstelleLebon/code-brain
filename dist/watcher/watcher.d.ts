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
export declare class Watcher {
    private watcher;
    private indexer;
    private embedder;
    private telemetry;
    private handlers;
    private debounceTimers;
    private debounceMs;
    constructor(indexer: Indexer, embedder: Embedder, telemetry: Telemetry, debounceMs?: number);
    start(repoPath: string, glob?: string): void;
    stop(): void;
    onEvent(handler: (data: WatcherEventData) => void): void;
    private handleFileEvent;
    private processFileChange;
    private handleUnlink;
    private emitEvent;
    isRunning(): boolean;
}
//# sourceMappingURL=watcher.d.ts.map