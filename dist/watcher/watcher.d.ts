import { Indexer } from '../indexer/indexer.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { Embedder } from '../embeddings/embedder.js';
import { InvalidationEngine } from '../invalidation/InvalidationEngine.js';
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
export declare class Watcher {
    private watcher;
    private indexer;
    private embedder;
    private telemetry;
    private handlers;
    private debounceTimers;
    private debounceMs;
    private invalidationEngine?;
    private transactionCoordinator?;
    constructor(indexer: Indexer, embedder: Embedder, telemetry: Telemetry, debounceMs?: number, options?: WatcherOptions);
    start(repoPath: string, glob?: string): void;
    stop(): void;
    onEvent(handler: (data: WatcherEventData) => void): void;
    private handleFileEvent;
    private processFileChange;
    private processFileChangeWithCognition;
    private handleUnlink;
    private emitEvent;
    isRunning(): boolean;
}
//# sourceMappingURL=watcher.d.ts.map