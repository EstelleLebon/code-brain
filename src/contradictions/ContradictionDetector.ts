import { createHash } from 'crypto';
import { Claim } from '../types/index.js';
import { Contradiction, ContradictionReport, ContradictionSeverity, ContradictionKind } from './types.js';

function makeContradictionId(sourceA: string, sourceB: string, kind: string): string {
  return createHash('sha256')
    .update(`${kind}:${sourceA}:${sourceB}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Extract a numeric value from a claim string like "Function has 3 parameters".
 * Returns [prefix, number] if found, null otherwise.
 */
function extractNumericClaim(claim: string): { prefix: string; value: number } | null {
  const match = claim.match(/^(.+?)\s+(\d+)\s+(.*)$/);
  if (!match) return null;
  return {
    prefix: (match[1]! + ' ' + match[3]!).trim(),
    value: parseInt(match[2]!, 10),
  };
}

export class ContradictionDetector {
  private handlers: Array<(c: Contradiction) => void> = [];

  detect(claims: Claim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // Group claims by symbolId
    const bySymbol = new Map<string, Claim[]>();
    for (const claim of claims) {
      const existing = bySymbol.get(claim.symbolId) ?? [];
      existing.push(claim);
      bySymbol.set(claim.symbolId, existing);
    }

    for (const [, symbolClaims] of bySymbol) {
      // Look for numeric claims with matching prefix but different values
      const numericClaims: Array<{ claim: Claim; prefix: string; value: number }> = [];
      for (const claim of symbolClaims) {
        const parsed = extractNumericClaim(claim.claim);
        if (parsed) {
          numericClaims.push({ claim, prefix: parsed.prefix, value: parsed.value });
        }
      }

      // Group numeric claims by prefix
      const byPrefix = new Map<string, typeof numericClaims>();
      for (const item of numericClaims) {
        const existing = byPrefix.get(item.prefix) ?? [];
        existing.push(item);
        byPrefix.set(item.prefix, existing);
      }

      for (const [, items] of byPrefix) {
        if (items.length < 2) continue;
        // Check all pairs for different values
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i]!;
            const b = items[j]!;
            if (a.value !== b.value) {
              const contradiction: Contradiction = {
                id: makeContradictionId(a.claim.id, b.claim.id, 'claim_vs_claim'),
                kind: 'claim_vs_claim',
                severity: 'medium',
                sourceA: a.claim.id,
                sourceB: b.claim.id,
                description: `Conflicting claims for symbol ${a.claim.symbolId}: "${a.claim.claim}" vs "${b.claim.claim}"`,
                detectedAt: Date.now(),
                resolved: false,
              };
              contradictions.push(contradiction);
              for (const handler of this.handlers) {
                handler(contradiction);
              }
            }
          }
        }
      }

      // Also check for direct string duplicates that differ
      const exactByText = new Map<string, Claim[]>();
      for (const claim of symbolClaims) {
        // Normalize: strip trailing numbers and compare prefixes for boolean contradictions
        // e.g., "Symbol is exported" vs "Symbol is not exported"
        const posKey = claim.claim.replace(/\bnot\s+/gi, '');
        const existing = exactByText.get(posKey) ?? [];
        existing.push(claim);
        exactByText.set(posKey, existing);
      }

      for (const [, group] of exactByText) {
        if (group.length < 2) continue;
        // Detect positive/negative contradiction
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a = group[i]!;
            const b = group[j]!;
            const aHasNot = /\bnot\b/i.test(a.claim);
            const bHasNot = /\bnot\b/i.test(b.claim);
            if (aHasNot !== bHasNot && a.claim !== b.claim) {
              const contradiction: Contradiction = {
                id: makeContradictionId(a.id, b.id, 'claim_vs_claim_bool'),
                kind: 'claim_vs_claim',
                severity: 'high',
                sourceA: a.id,
                sourceB: b.id,
                description: `Boolean contradiction for symbol ${a.symbolId}: "${a.claim}" vs "${b.claim}"`,
                detectedAt: Date.now(),
                resolved: false,
              };
              contradictions.push(contradiction);
              for (const handler of this.handlers) {
                handler(contradiction);
              }
            }
          }
        }
      }
    }

    return contradictions;
  }

  report(contradictions: Contradiction[]): ContradictionReport {
    const bySeverity: Record<ContradictionSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };
    const byKind: Record<ContradictionKind, number> = {
      claim_vs_claim: 0,
      chunk_vs_ast: 0,
      runtime_vs_claim: 0,
      type_mismatch: 0,
      signature_drift: 0,
    };

    for (const c of contradictions) {
      bySeverity[c.severity]++;
      byKind[c.kind]++;
    }

    return {
      contradictions,
      totalCount: contradictions.length,
      bySeverity,
      byKind,
    };
  }

  onDetected(handler: (c: Contradiction) => void): void {
    this.handlers.push(handler);
  }
}
