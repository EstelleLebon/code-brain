"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolver = void 0;
class ConflictResolver {
    resolveSemanticConflict(conflict) {
        const { entries } = conflict;
        if (entries.length === 0)
            throw new Error('No entries to resolve');
        if (entries.length === 1)
            return { resolved: entries[0], strategy: 'single', discarded: [] };
        const sorted = [...entries].sort((a, b) => {
            if (b.confidence !== a.confidence)
                return b.confidence - a.confidence;
            return b.version - a.version;
        });
        return {
            resolved: sorted[0],
            strategy: 'highest_confidence_then_latest_version',
            discarded: sorted.slice(1),
        };
    }
    resolveEpisodicConflict(entries) {
        if (entries.length === 0)
            throw new Error('No entries to resolve');
        const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
        return {
            resolved: sorted[0],
            strategy: 'append_all_keep_latest',
            discarded: [],
        };
    }
    resolveTrustConflict(entries) {
        if (entries.length === 0)
            throw new Error('No entries to resolve');
        const sorted = [...entries].sort((a, b) => a.confidence - b.confidence);
        return {
            resolved: sorted[0],
            strategy: 'minimum_trust_conservative',
            discarded: sorted.slice(1),
        };
    }
}
exports.ConflictResolver = ConflictResolver;
//# sourceMappingURL=ConflictResolver.js.map