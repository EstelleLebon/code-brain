export interface SemanticFact {
    id: string;
    concept: string;
    description: string;
    confidence: number;
    sources: string[];
    createdAt: number;
    updatedAt: number;
}
/**
 * Stable learned facts about code structure, patterns, and abstractions.
 * Consolidated from episodic memory over time.
 */
export declare class SemanticMemory {
    private facts;
    upsert(concept: string, description: string, confidence: number, sourceId: string): SemanticFact;
    findByConcept(concept: string): SemanticFact | undefined;
    search(keyword: string): SemanticFact[];
    topByConfidence(limit?: number): SemanticFact[];
    all(): SemanticFact[];
    size(): number;
}
//# sourceMappingURL=SemanticMemory.d.ts.map