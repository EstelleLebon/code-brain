import { DependencyGraph } from '../graph/dependency-graph.js';
import { DB } from '../persistence/db.js';
import { Telemetry } from '../telemetry/telemetry.js';
export interface InvalidationEvent {
    filePath: string;
    symbolIds: string[];
    timestamp: number;
    reason: string;
}
export interface InvalidationResult {
    invalidatedFiles: string[];
    invalidatedSymbols: string[];
    invalidatedClaims: string[];
    invalidatedChunks: string[];
    propagationDepth: number;
    durationMs: number;
}
export declare class InvalidationEngine {
    private db;
    private graph;
    private telemetry;
    private analyzer;
    constructor(db: DB, graph: DependencyGraph, telemetry: Telemetry);
    propagate(event: InvalidationEvent): InvalidationResult;
    private computeDepth;
}
//# sourceMappingURL=InvalidationEngine.d.ts.map