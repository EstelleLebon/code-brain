import { RetrievalResult, ContextEntropyMetrics } from '../types/index.js';

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 0));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function computeEntropyMetrics(results: RetrievalResult[]): ContextEntropyMetrics {
  const chunkCount = results.length;

  if (chunkCount === 0) {
    return {
      redundancyScore: 0,
      overlapScore: 0,
      diversityScore: 0,
      signalNoiseRatio: 0,
      chunkCount: 0,
      uniqueFileCount: 0,
    };
  }

  // Pre-tokenize all chunks
  const tokenSets = results.map(r => tokenize(r.chunk.content));

  // Compute pairwise Jaccard (capped at 100 pairs)
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      pairs.push([i, j]);
      if (pairs.length >= 100) break;
    }
    if (pairs.length >= 100) break;
  }

  let nearDuplicatePairs = 0;
  let totalSimilarity = 0;

  for (const [i, j] of pairs) {
    const sim = jaccardSimilarity(tokenSets[i]!, tokenSets[j]!);
    totalSimilarity += sim;
    if (sim > 0.8) nearDuplicatePairs++;
  }

  const pairCount = pairs.length;
  const redundancyScore = pairCount > 0 ? nearDuplicatePairs / pairCount : 0;
  const overlapScore = pairCount > 0 ? Math.min(1, totalSimilarity / pairCount) : 0;

  // Unique files
  const uniqueFiles = new Set(results.map(r => {
    // Get filePath from chunk's symbolId — use chunk content as fallback key
    // The symbolId is the symbol's id; trace.source contains the file path
    return r.trace.source;
  }));
  const uniqueFileCount = uniqueFiles.size;
  const diversityScore = chunkCount > 0 ? Math.min(1, uniqueFileCount / chunkCount) : 0;

  // Signal-to-noise ratio: mean confidence
  const signalNoiseRatio = results.reduce((sum, r) => sum + r.trace.confidence, 0) / chunkCount;

  return {
    redundancyScore,
    overlapScore,
    diversityScore,
    signalNoiseRatio,
    chunkCount,
    uniqueFileCount,
  };
}
