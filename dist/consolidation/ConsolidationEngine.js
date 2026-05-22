"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsolidationEngine = void 0;
const MemoryCompactor_js_1 = require("./MemoryCompactor.js");
const SemanticSummarizer_js_1 = require("./SemanticSummarizer.js");
const RetrievalDecay_js_1 = require("./RetrievalDecay.js");
/**
 * Orchestrates memory consolidation: compaction, summarization, and decay scoring.
 */
class ConsolidationEngine {
    compactor;
    constructor(db) {
        this.compactor = new MemoryCompactor_js_1.MemoryCompactor(db);
    }
    /** Run full consolidation cycle. */
    consolidate(options = {}) {
        const compaction = this.compactor.compact(options.compactOptions);
        // Group chunks by symbolId for cluster summarization
        const summaries = [];
        if (options.chunks && options.chunks.length > 0) {
            const bySymbol = new Map();
            for (const c of options.chunks) {
                if (!bySymbol.has(c.symbolId))
                    bySymbol.set(c.symbolId, []);
                bySymbol.get(c.symbolId).push(c);
            }
            for (const cluster of bySymbol.values()) {
                if (cluster.length > 1) {
                    summaries.push((0, SemanticSummarizer_js_1.summarizeCluster)(cluster));
                }
            }
        }
        const decayScores = new Map();
        if (options.decayInputs) {
            for (const input of options.decayInputs) {
                decayScores.set(input.chunk.id, (0, RetrievalDecay_js_1.computeDecayScore)(input));
            }
        }
        return { compaction, summaries, decayScores };
    }
}
exports.ConsolidationEngine = ConsolidationEngine;
//# sourceMappingURL=ConsolidationEngine.js.map