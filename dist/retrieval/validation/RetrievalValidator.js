"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalValidator = void 0;
const index_js_1 = require("../../types/index.js");
class RetrievalValidator {
    validate(chunks) {
        const staleArtifacts = [];
        const contradictions = [];
        const warnings = [];
        for (const chunk of chunks) {
            // staleness check
            if (chunk.invalidatedAt) {
                staleArtifacts.push(chunk.id);
            }
            // truth level warning
            if (chunk.truthLevel === index_js_1.TruthLevel.HEURISTIC) {
                warnings.push(`Chunk ${chunk.id} has HEURISTIC truth level`);
            }
        }
        // contradiction check: same symbolId, different filePath
        const symbolMap = new Map();
        for (const chunk of chunks) {
            if (chunk.symbolId) {
                if (!symbolMap.has(chunk.symbolId))
                    symbolMap.set(chunk.symbolId, new Set());
                symbolMap.get(chunk.symbolId).add(chunk.filePath ?? chunk.symbolId);
            }
        }
        for (const [symbolId, files] of symbolMap) {
            if (files.size > 1) {
                contradictions.push(`Symbol ${symbolId} appears in multiple files: ${[...files].join(', ')}`);
            }
        }
        return {
            valid: staleArtifacts.length === 0 && contradictions.length === 0,
            staleArtifacts,
            contradictions,
            warnings,
        };
    }
}
exports.RetrievalValidator = RetrievalValidator;
//# sourceMappingURL=RetrievalValidator.js.map