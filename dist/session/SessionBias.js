"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySessionBias = applySessionBias;
function applySessionBias(results, session, boostFactor = 0.2) {
    const boosted = results.map(result => {
        const entry = session.entries.get(result.chunk.symbolId);
        const fileMatch = session.focusFiles.has(result.trace.source);
        if (entry || fileMatch) {
            return {
                ...result,
                score: result.score + boostFactor,
                trace: {
                    ...result.trace,
                    retrievalReason: 'session_bias',
                },
            };
        }
        return result;
    });
    // Re-sort by score desc
    return boosted.sort((a, b) => b.score - a.score);
}
//# sourceMappingURL=SessionBias.js.map