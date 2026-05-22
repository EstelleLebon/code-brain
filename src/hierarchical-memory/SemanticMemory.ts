export interface SemanticFact {
  id: string;
  concept: string;
  description: string;
  confidence: number;   // 0-1
  sources: string[];    // operation IDs or chunk IDs that reinforced this fact
  createdAt: number;
  updatedAt: number;
}

function makeId(): string {
  return `smem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Stable learned facts about code structure, patterns, and abstractions.
 * Consolidated from episodic memory over time.
 */
export class SemanticMemory {
  private facts = new Map<string, SemanticFact>();

  upsert(concept: string, description: string, confidence: number, sourceId: string): SemanticFact {
    const existing = this.findByConcept(concept);
    if (existing) {
      existing.confidence = Math.min(1, (existing.confidence + confidence) / 2);
      if (!existing.sources.includes(sourceId)) existing.sources.push(sourceId);
      existing.updatedAt = Date.now();
      return existing;
    }

    const fact: SemanticFact = {
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

  findByConcept(concept: string): SemanticFact | undefined {
    return [...this.facts.values()].find(f => f.concept === concept);
  }

  search(keyword: string): SemanticFact[] {
    const kw = keyword.toLowerCase();
    return [...this.facts.values()].filter(f =>
      f.concept.toLowerCase().includes(kw) || f.description.toLowerCase().includes(kw)
    );
  }

  topByConfidence(limit = 10): SemanticFact[] {
    return [...this.facts.values()].sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  all(): SemanticFact[] {
    return [...this.facts.values()];
  }

  size(): number {
    return this.facts.size;
  }
}
