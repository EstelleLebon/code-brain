import { SemanticChunk, TruthLevel } from '../../types/index.js';
import { RetrievalValidationResult } from './types.js';

export class RetrievalValidator {
  validate(chunks: SemanticChunk[]): RetrievalValidationResult {
    const staleArtifacts: string[] = [];
    const contradictions: string[] = [];
    const warnings: string[] = [];

    for (const chunk of chunks) {
      // staleness check
      if ((chunk as any).invalidatedAt) {
        staleArtifacts.push(chunk.id);
      }
      // truth level warning
      if (chunk.truthLevel === TruthLevel.HEURISTIC) {
        warnings.push(`Chunk ${chunk.id} has HEURISTIC truth level`);
      }
    }

    // contradiction check: same symbolId, different filePath
    const symbolMap = new Map<string, Set<string>>();
    for (const chunk of chunks) {
      if (chunk.symbolId) {
        if (!symbolMap.has(chunk.symbolId)) symbolMap.set(chunk.symbolId, new Set());
        symbolMap.get(chunk.symbolId)!.add((chunk as any).filePath ?? chunk.symbolId);
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
