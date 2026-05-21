import { createHash } from 'crypto';
import { SymbolNode, Claim, TruthLevel } from '../types/index.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { DB } from '../persistence/db.js';

function makeClaimId(symbolId: string, claim: string): string {
  return createHash('sha256').update(symbolId + ':' + claim).digest('hex').slice(0, 16);
}

function countParams(signature: string): number {
  const parenMatch = signature.match(/\(([^)]*)\)/);
  if (!parenMatch || !parenMatch[1]) return 0;
  const inner = parenMatch[1].trim();
  if (!inner) return 0;
  return inner.split(',').filter(p => p.trim()).length;
}

function hasReturnType(signature: string): boolean {
  return /\)\s*:\s*\S/.test(signature);
}

function extractExtendsName(signature: string): string | null {
  const match = signature.match(/extends\s+(\w+)/);
  return match?.[1] ?? null;
}

function extractImplementsNames(signature: string): string[] {
  const match = signature.match(/implements\s+([^{]+)/);
  if (!match?.[1]) return [];
  return match[1].split(',').map(s => s.trim()).filter(Boolean);
}

export class ClaimsEngine {
  private db: DB;
  private graph: DependencyGraph;

  constructor(db: DB, graph: DependencyGraph) {
    this.db = db;
    this.graph = graph;
  }

  generateClaims(sym: SymbolNode): Claim[] {
    const claims: Claim[] = [];
    const sig = sym.signature ?? '';
    const confidence = 1.0;

    const addClaim = (claim: string): void => {
      claims.push({
        id: makeClaimId(sym.id, claim),
        symbolId: sym.id,
        claim,
        confidence,
        sourceHash: sym.hash,
        truthLevel: TruthLevel.DERIVED,
      });
    };

    // Export status
    if (sym.exported) {
      addClaim('Symbol is exported');
    } else {
      addClaim('Symbol is not exported');
    }

    // Kind-specific claims
    switch (sym.kind) {
      case 'function':
      case 'method': {
        const paramCount = countParams(sig);
        addClaim(`Function has ${paramCount} parameter${paramCount !== 1 ? 's' : ''}`);
        if (!hasReturnType(sig)) {
          addClaim('Function has no return type annotation');
        } else {
          const retMatch = sig.match(/\)\s*:\s*([^{]+)/);
          if (retMatch?.[1]) {
            addClaim(`Function returns ${retMatch[1].trim()}`);
          }
        }
        if (sig.includes('async')) {
          addClaim('Function is async');
        }
        if (sig.includes('static')) {
          addClaim('Method is static');
        }
        if (sig.includes('private')) {
          addClaim('Method is private');
        }
        if (sig.includes('protected')) {
          addClaim('Method is protected');
        }
        break;
      }

      case 'class': {
        const extendsName = extractExtendsName(sig);
        if (extendsName) {
          addClaim(`Class extends ${extendsName}`);
        }
        const implementsNames = extractImplementsNames(sig);
        for (const name of implementsNames) {
          addClaim(`Class implements ${name}`);
        }
        if (sig.includes('abstract')) {
          addClaim('Class is abstract');
        }
        break;
      }

      case 'interface': {
        const extendsName = extractExtendsName(sig);
        if (extendsName) {
          addClaim(`Interface extends ${extendsName}`);
        }
        break;
      }

      case 'variable': {
        if (sig.includes('const ')) {
          addClaim('Variable is declared as const');
        } else if (sig.includes('let ')) {
          addClaim('Variable is declared as let');
        }
        break;
      }

      case 'enum': {
        if (sig.includes('const enum')) {
          addClaim('Enum is a const enum');
        }
        break;
      }

      case 'type': {
        addClaim('Symbol is a type alias');
        break;
      }
    }

    // Line count
    const lineCount = sym.endLine - sym.startLine + 1;
    addClaim(`Symbol spans ${lineCount} line${lineCount !== 1 ? 's' : ''}`);

    // Dependency count
    const depCount = sym.dependencies.length;
    if (depCount > 0) {
      addClaim(`Symbol has ${depCount} direct dependenc${depCount !== 1 ? 'ies' : 'y'}`);
    }

    // Dependents count
    const dependents = this.graph.getDependents(sym.id, 1);
    if (dependents.length > 0) {
      addClaim(`Symbol has ${dependents.length} dependent${dependents.length !== 1 ? 's' : ''}`);
    }

    // Circular dependency check
    if (this.graph.hasCircularDependency(sym.id)) {
      addClaim('Symbol has circular dependency');
    }

    return claims;
  }

  generateAndStoreClaims(sym: SymbolNode): Claim[] {
    // Remove old claims
    this.db.deleteClaimsBySymbolId(sym.id);

    // Generate new claims
    const claims = this.generateClaims(sym);

    // Store
    this.db.insertClaimsBatch(claims);

    return claims;
  }

  generateAndStoreClaimsBatch(symbols: SymbolNode[]): void {
    const allClaims: Claim[] = [];
    for (const sym of symbols) {
      this.db.deleteClaimsBySymbolId(sym.id);
      allClaims.push(...this.generateClaims(sym));
    }
    this.db.insertClaimsBatch(allClaims);
  }

  getClaimsForSymbol(symbolId: string): Claim[] {
    return this.db.getClaimsBySymbolId(symbolId);
  }

  invalidateClaimsForSymbol(symbolId: string): void {
    this.db.deleteClaimsBySymbolId(symbolId);
  }
}
