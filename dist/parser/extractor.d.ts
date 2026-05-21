import { SymbolNode, ParsedFile, DependencyEdge, SymbolKind } from '../types/index.js';
export declare function makeSymbolId(filePath: string, name: string, kind: SymbolKind): string;
export declare function makeContentHash(text: string): string;
export declare function makeClaimId(symbolId: string, claim: string): string;
export declare function makeChunkId(symbolId: string): string;
export declare function extractSymbols(parsed: ParsedFile): SymbolNode[];
export declare function extractEdges(parsed: ParsedFile, localSymbols: SymbolNode[], allSymbolIds: Map<string, string>): DependencyEdge[];
export declare function buildSymbolIdSet(symbols: SymbolNode[]): Map<string, string>;
//# sourceMappingURL=extractor.d.ts.map