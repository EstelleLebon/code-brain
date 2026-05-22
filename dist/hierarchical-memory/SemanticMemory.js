"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMemory = void 0;
function makeId() {
    return `smem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
/**
 * Stable learned facts about code structure, patterns, and abstractions.
 * Consolidated from episodic memory over time.
 */
class SemanticMemory {
    facts = new Map();
    upsert(concept, description, confidence, sourceId) {
        const existing = this.findByConcept(concept);
        if (existing) {
            existing.confidence = Math.min(1, (existing.confidence + confidence) / 2);
            if (!existing.sources.includes(sourceId))
                existing.sources.push(sourceId);
            existing.updatedAt = Date.now();
            return existing;
        }
        const fact = {
            id: makeId(),
            concept,
            description,
            confidence,
            sources: [sourceId],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.facts.set(fact.id, fact);
        return fact;
    }
    findByConcept(concept) {
        return [...this.facts.values()].find(f => f.concept === concept);
    }
    search(keyword) {
        const kw = keyword.toLowerCase();
        return [...this.facts.values()].filter(f => f.concept.toLowerCase().includes(kw) || f.description.toLowerCase().includes(kw));
    }
    topByConfidence(limit = 10) {
        return [...this.facts.values()].sort((a, b) => b.confidence - a.confidence).slice(0, limit);
    }
    all() {
        return [...this.facts.values()];
    }
    size() {
        return this.facts.size;
    }
}
exports.SemanticMemory = SemanticMemory;
//# sourceMappingURL=SemanticMemory.js.map