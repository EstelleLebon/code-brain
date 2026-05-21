"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkSymbol = chunkSymbol;
exports.chunkSymbols = chunkSymbols;
const crypto_1 = require("crypto");
const index_js_1 = require("../types/index.js");
function makeChunkId(symbolId) {
    return (0, crypto_1.createHash)('sha256').update('chunk:' + symbolId).digest('hex').slice(0, 16);
}
function buildSummary(sym, _content) {
    const parts = [];
    parts.push(`${sym.exported ? 'exported ' : ''}${sym.kind} '${sym.name}'`);
    parts.push(`at ${sym.filePath}:${sym.startLine}-${sym.endLine}`);
    // Extract parameters from signature for functions/methods
    if (sym.kind === 'function' || sym.kind === 'method') {
        const sig = sym.signature ?? '';
        const parenMatch = sig.match(/\(([^)]*)\)/);
        if (parenMatch && parenMatch[1]) {
            const params = parenMatch[1].trim();
            if (params) {
                const paramList = params.split(',').map(p => p.trim()).filter(Boolean);
                parts.push(`parameters: [${paramList.join(', ')}]`);
            }
            else {
                parts.push('no parameters');
            }
        }
        // Return type
        const returnMatch = sig.match(/\)\s*:\s*([^{]+)/);
        if (returnMatch && returnMatch[1]) {
            parts.push(`returns: ${returnMatch[1].trim()}`);
        }
    }
    // Class heritage
    if (sym.kind === 'class') {
        const sig = sym.signature ?? '';
        const extendsMatch = sig.match(/extends\s+(\w+)/);
        const implementsMatch = sig.match(/implements\s+([^{]+)/);
        if (extendsMatch?.[1])
            parts.push(`extends: ${extendsMatch[1]}`);
        if (implementsMatch?.[1])
            parts.push(`implements: ${implementsMatch[1].trim()}`);
    }
    if (sym.dependencies.length > 0) {
        parts.push(`dependencies: ${sym.dependencies.length}`);
    }
    // Line count
    const lineCount = sym.endLine - sym.startLine + 1;
    parts.push(`${lineCount} lines`);
    return parts.join('; ');
}
function chunkSymbol(sym, rawSource) {
    const content = rawSource ?? sym.signature ?? sym.name;
    const id = makeChunkId(sym.id);
    const hash = (0, crypto_1.createHash)('sha256').update(content).digest('hex').slice(0, 16);
    const summary = buildSummary(sym, content);
    return {
        id,
        symbolId: sym.id,
        content,
        summary,
        hash,
        truthLevel: index_js_1.TruthLevel.STRUCTURAL,
    };
}
function chunkSymbols(symbols, sourceMap // symbolId -> raw source
) {
    return symbols.map(sym => chunkSymbol(sym, sourceMap?.get(sym.id)));
}
//# sourceMappingURL=chunker.js.map