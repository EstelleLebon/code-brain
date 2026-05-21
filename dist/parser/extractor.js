"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSymbolId = makeSymbolId;
exports.makeContentHash = makeContentHash;
exports.makeClaimId = makeClaimId;
exports.makeChunkId = makeChunkId;
exports.extractSymbols = extractSymbols;
exports.extractEdges = extractEdges;
exports.buildSymbolIdSet = buildSymbolIdSet;
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
function makeSymbolId(filePath, name, kind) {
    return (0, crypto_1.createHash)('sha256')
        .update(filePath + ':' + name + ':' + kind)
        .digest('hex')
        .slice(0, 16);
}
function makeContentHash(text) {
    return (0, crypto_1.createHash)('sha256').update(text).digest('hex').slice(0, 16);
}
function makeClaimId(symbolId, claim) {
    return (0, crypto_1.createHash)('sha256').update(symbolId + ':' + claim).digest('hex').slice(0, 16);
}
function makeChunkId(symbolId) {
    return (0, crypto_1.createHash)('sha256').update('chunk:' + symbolId).digest('hex').slice(0, 16);
}
function resolveImportedSymbolId(importedName, modulePath, currentFilePath, knownSymbolIds // name:kind -> id
) {
    // Try to resolve relative imports
    if (modulePath.startsWith('.')) {
        const dir = path_1.default.dirname(currentFilePath);
        const candidates = [
            path_1.default.resolve(dir, modulePath + '.ts'),
            path_1.default.resolve(dir, modulePath + '.tsx'),
            path_1.default.resolve(dir, modulePath, 'index.ts'),
        ];
        for (const candidate of candidates) {
            // Try all known kinds for this name
            const kinds = ['function', 'class', 'interface', 'type', 'variable', 'enum', 'namespace', 'export'];
            for (const kind of kinds) {
                const candidateId = makeSymbolId(candidate, importedName, kind);
                if (knownSymbolIds.has(candidateId)) {
                    return candidateId;
                }
            }
        }
    }
    return null;
}
function extractSymbols(parsed) {
    const now = Date.now();
    const symbols = [];
    function processRawSymbol(raw, parentId) {
        const id = makeSymbolId(parsed.filePath, raw.name, raw.kind);
        const hash = makeContentHash(raw.sourceText);
        const sym = {
            id,
            name: raw.name,
            kind: raw.kind,
            filePath: parsed.filePath,
            startLine: raw.startLine,
            endLine: raw.endLine,
            signature: raw.signature,
            exported: raw.exported,
            dependencies: [],
            hash,
            createdAt: now,
            updatedAt: now,
        };
        symbols.push(sym);
        // Process children (methods, properties)
        if (raw.children) {
            for (const child of raw.children) {
                processRawSymbol(child, id);
            }
        }
    }
    for (const raw of parsed.symbols) {
        processRawSymbol(raw);
    }
    return symbols;
}
function extractEdges(parsed, localSymbols, allSymbolIds // symbolId -> symbolId (identity map for existence check)
) {
    const edges = [];
    const localSymbolMap = new Map();
    for (const sym of localSymbols) {
        localSymbolMap.set(sym.name, sym);
    }
    // Build edges from imports
    for (const imp of parsed.imports) {
        for (const name of imp.names) {
            // Try to find matching symbol
            const kinds = ['function', 'class', 'interface', 'type', 'variable', 'enum', 'namespace', 'export'];
            if (imp.source.startsWith('.')) {
                const dir = path_1.default.dirname(parsed.filePath);
                // Normalize ESM .js imports to .ts for source resolution
                const src = imp.source.replace(/\.js$/, '');
                const candidates = [
                    path_1.default.resolve(dir, src + '.ts'),
                    path_1.default.resolve(dir, src + '.tsx'),
                    path_1.default.resolve(dir, src, 'index.ts'),
                ];
                for (const candidate of candidates) {
                    for (const kind of kinds) {
                        const targetId = makeSymbolId(candidate, name, kind);
                        if (allSymbolIds.has(targetId)) {
                            // Find a local symbol that "uses" this import — attribute to file-level
                            for (const sym of localSymbols) {
                                edges.push({
                                    fromId: sym.id,
                                    toId: targetId,
                                    kind: 'import',
                                });
                                break; // only first symbol
                            }
                        }
                    }
                }
            }
        }
    }
    // Intra-file edges: look for name references within sourceText
    for (const sym of localSymbols) {
        // Skip the symbol itself
        for (const other of localSymbols) {
            if (other.id === sym.id)
                continue;
            // Check if sym's source text references other symbol's name
            // Use word boundary check to avoid false positives
            const re = new RegExp(`\\b${other.name}\\b`);
            if (re.test(sym.signature ?? '') || (sym.kind !== 'class' && re.test(''))) {
                // Only add if meaningfully referenced — check signature level
                // This is a lightweight heuristic
            }
        }
    }
    return edges;
}
function buildSymbolIdSet(symbols) {
    const map = new Map();
    for (const sym of symbols) {
        map.set(sym.id, sym.id);
    }
    return map;
}
//# sourceMappingURL=extractor.js.map