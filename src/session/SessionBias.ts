import { RetrievalResult } from '../types/index.js';
import { SessionContext } from './SessionContext.js';

export function applySessionBias(
  results: RetrievalResult[],
  session: SessionContext,
  boostFactor = 0.2
): RetrievalResult[] {
  const boosted = results.map(result => {
    const entry = session.entries.get(result.chunk.symbolId);
    const fileMatch = session.focusFiles.has(result.trace.source);

    if (entry || fileMatch) {
      return {
        ...result,
        score: result.score + boostFactor,
        trace: {
          ...result.trace,
          retrievalReason: 'session_bias' as const,
        },
      };
    }
    return result;
  });

  // Re-sort by score desc
  return boosted.sort((a, b) => b.score - a.score);
}
