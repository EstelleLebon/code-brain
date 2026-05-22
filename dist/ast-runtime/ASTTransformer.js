"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTTransformer = void 0;
class ASTTransformer {
    /**
     * Applies mutations in reverse order (highest startIndex first) so earlier
     * mutations don't shift the character positions of later ones.
     */
    apply(source, mutations) {
        if (mutations.length === 0)
            return { source, changed: false, appliedCount: 0 };
        const sorted = [...mutations].sort((a, b) => b.startIndex - a.startIndex);
        let result = source;
        for (const m of sorted) {
            result = result.slice(0, m.startIndex) + m.replacement + result.slice(m.endIndex);
        }
        return { source: result, changed: result !== source, appliedCount: sorted.length };
    }
    applyToFiles(fileMap, mutations) {
        const byFile = new Map();
        for (const m of mutations) {
            const list = byFile.get(m.filePath) ?? [];
            list.push(m);
            byFile.set(m.filePath, list);
        }
        const results = new Map();
        for (const [filePath, source] of fileMap) {
            const fileMutations = byFile.get(filePath) ?? [];
            results.set(filePath, this.apply(source, fileMutations));
        }
        return results;
    }
}
exports.ASTTransformer = ASTTransformer;
//# sourceMappingURL=ASTTransformer.js.map