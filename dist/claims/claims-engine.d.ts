import { SymbolNode, Claim } from '../types/index.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { DB } from '../persistence/db.js';
export declare class ClaimsEngine {
    private db;
    private graph;
    constructor(db: DB, graph: DependencyGraph);
    generateClaims(sym: SymbolNode): Claim[];
    generateAndStoreClaims(sym: SymbolNode): Claim[];
    generateAndStoreClaimsBatch(symbols: SymbolNode[]): void;
    getClaimsForSymbol(symbolId: string): Claim[];
    invalidateClaimsForSymbol(symbolId: string): void;
}
//# sourceMappingURL=claims-engine.d.ts.map