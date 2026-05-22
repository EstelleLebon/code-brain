"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Watcher = void 0;
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
class Watcher {
    watcher = null;
    indexer;
    embedder;
    telemetry;
    handlers = [];
    debounceTimers = new Map();
    debounceMs;
    invalidationEngine;
    transactionCoordinator;
    constructor(indexer, embedder, telemetry, debounceMs = 300, options = {}) {
        this.indexer = indexer;
        this.embedder = embedder;
        this.telemetry = telemetry;
        this.debounceMs = debounceMs;
        this.invalidationEngine = options.invalidationEngine;
        this.transactionCoordinator = options.transactionCoordinator;
    }
    start(repoPath, glob = '**/*.{ts,tsx}') {
        if (this.watcher) {
            this.telemetry.log('warn', 'watcher.already_running', {});
            return;
        }
        const watchPattern = path_1.default.join(repoPath, glob);
        this.telemetry.log('info', 'watcher.start', { pattern: watchPattern });
        this.watcher = chokidar_1.default.watch(watchPattern, {
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
        this.watcher.on('add', (filePath) => this.handleFileEvent('add', filePath));
        this.watcher.on('change', (filePath) => this.handleFileEvent('change', filePath));
        this.watcher.on('unlink', (filePath) => this.handleUnlink(filePath));
        this.watcher.on('error', (err) => {
            this.telemetry.log('error', 'watcher.error', { error: String(err) });
        });
    }
    stop() {
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
    onEvent(handler) {
        this.handlers.push(handler);
    }
    handleFileEvent(event, filePath) {
        const absPath = path_1.default.resolve(filePath);
        // Debounce
        const existing = this.debounceTimers.get(absPath);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => {
            this.debounceTimers.delete(absPath);
            void this.processFileChange(event, absPath);
        }, this.debounceMs);
        this.debounceTimers.set(absPath, timer);
    }
    async processFileChange(event, filePath) {
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
            const data = {
                event,
                filePath,
                timestamp: Date.now(),
                changed,
            };
            this.telemetry.metric('watcher.file_processed', 1, { event });
            this.emitEvent(data);
        }
        catch (err) {
            this.telemetry.log('error', 'watcher.process_error', { filePath, error: String(err) });
        }
    }
    async processFileChangeWithCognition(event, filePath) {
        const start = Date.now();
        const txResult = await this.transactionCoordinator.execute(async (_txn) => {
            // Propagate invalidation
            const invalidationEvent = {
                filePath,
                symbolIds: [],
                timestamp: Date.now(),
                reason: `file_${event}`,
            };
            const invalidationResult = this.invalidationEngine.propagate(invalidationEvent);
            // Re-index file
            const changed = this.indexer.updateFile(filePath);
            this.embedder.rebuildVocabulary();
            return { invalidationResult, changed };
        });
        const durationMs = Date.now() - start;
        let cognitiveUpdate;
        if (txResult.success && txResult.data) {
            const { invalidationResult } = txResult.data;
            cognitiveUpdate = {
                invalidatedArtifacts: invalidationResult.invalidatedSymbols.length +
                    invalidationResult.invalidatedClaims.length +
                    invalidationResult.invalidatedChunks.length,
                recomputedArtifacts: 1, // the re-indexed file
                propagationDepth: invalidationResult.propagationDepth,
                durationMs,
                committed: true,
                transactionId: txResult.transactionId,
            };
        }
        else {
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
        const data = {
            event,
            filePath,
            timestamp: Date.now(),
            changed: txResult.success && (txResult.data?.changed ?? false),
            cognitiveUpdate,
        };
        this.emitEvent(data);
    }
    handleUnlink(filePath) {
        const absPath = path_1.default.resolve(filePath);
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
    emitEvent(data) {
        for (const handler of this.handlers) {
            try {
                handler(data);
            }
            catch (err) {
                this.telemetry.log('error', 'watcher.handler_error', { error: String(err) });
            }
        }
    }
    isRunning() {
        return this.watcher !== null;
    }
}
exports.Watcher = Watcher;
//# sourceMappingURL=watcher.js.map