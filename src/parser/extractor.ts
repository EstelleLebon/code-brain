import { createHash } from 'crypto';
import path from 'path';
import {
  SymbolNode, RawSymbol, RawImport, ParsedFile,
  DependencyEdge, SymbolKind
} from '../types/index.js';

export function makeSymbolId(filePath: string, name: string, kind: SymbolKind): string {
  return createHash('sha256')
    .update(filePath + ':' + name + ':' + kind)
    .digest('hex')
    .slice(0, 16);
}

export function makeContentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function makeClaimId(symbolId: string, claim: string): string {
  return createHash('sha256').update(symbolId + ':' + claim).digest('hex').slice(0, 16);
}

export function makeChunkId(symbolId: string): string {
  return createHash('sha256').update('chunk:' + symbolId).digest('hex').slice(0, 16);
}

function resolveImportedSymbolId(
  importedName: string,
  modulePath: string,
  currentFilePath: string,
  knownSymbolIds: Map<string, string>  // name:kind -> id
): string | null {
  // Try to resolve relative imports
  if (modulePath.startsWith('.')) {
    const dir = path.dirname(currentFilePath);
    const candidates = [
      path.resolve(dir, modulePath + '.ts'),
      path.resolve(dir, modulePath + '.tsx'),
      path.resolve(dir, modulePath, 'index.ts'),
    ];
    for (const candidate of candidates) {
      // Try all known kinds for this name
      const kinds: SymbolKind[] = ['function', 'class', 'interface', 'type', 'variable', 'enum', 'namespace', 'export'];
      for (const kind of kinds) {
        const candidateId = makeSymbolId(candidate, importedName, kind);
        if (knownSymbolIds.has(candidateId)) {
          return candidateId;
        }
      }
    }
  }
  return null;
}

export function extractSymbols(parsed: ParsedFile): SymbolNode[] {
  const now = Date.now();
  const symbols: SymbolNode[] = [];

  function processRawSymbol(raw: RawSymbol, parentId?: string): void {
    const id = makeSymbolId(parsed.filePath, raw.name, raw.kind);
    const hash = makeContentHash(raw.sourceText);

    const sym: SymbolNode = {
      id,
      name: raw.name,
      kind: raw.kind,
      filePath: parsed.filePath,
      startLine: raw.startLine,
      endLine: raw.endLine,
      signature: raw.signature,
      exported: raw.exported,
      dependencies: [],
      hash,
      createdAt: now,
      updatedAt: now,
    };

    symbols.push(sym);

    // Process children (methods, properties)
    if (raw.children) {
      for (const child of raw.children) {
        processRawSymbol(child, id);
      }
    }
  }

  for (const raw of parsed.symbols) {
    processRawSymbol(raw);
  }

  return symbols;
}

export function extractEdges(
  parsed: ParsedFile,
  localSymbols: SymbolNode[],
  allSymbolIds: Map<string, string>  // symbolId -> symbolId (identity map for existence check)
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const localSymbolMap = new Map<string, SymbolNode>();
  for (const sym of localSymbols) {
    localSymbolMap.set(sym.name, sym);
  }

  // Build edges from imports
  for (const imp of parsed.imports) {
    for (const name of imp.names) {
      // Try to find matching symbol
      const kinds: SymbolKind[] = ['function', 'class', 'interface', 'type', 'variable', 'enum', 'namespace', 'export'];

      if (imp.source.startsWith('.')) {
        const dir = path.dirname(parsed.filePath);
        // Normalize ESM .js imports to .ts for source resolution
        const src = imp.source.replace(/\.js$/, '');
        const candidates = [
          path.resolve(dir, src + '.ts'),
          path.resolve(dir, src + '.tsx'),
          path.resolve(dir, src, 'index.ts'),
        ];

        for (const candidate of candidates) {
          for (const kind of kinds) {
            const targetId = makeSymbolId(candidate, name, kind);
            if (allSymbolIds.has(targetId)) {
              // Find a local symbol that "uses" this import — attribute to file-level
              for (const sym of localSymbols) {
                edges.push({
                  fromId: sym.id,
                  toId: targetId,
                  kind: 'import',
                });
                break; // only first symbol
              }
            }
          }
        }
      }
    }
  }

  // Intra-file edges: look for name references within sourceText
  for (const sym of localSymbols) {
    // Skip the symbol itself
    for (const other of localSymbols) {
      if (other.id === sym.id) continue;
      // Check if sym's source text references other symbol's name
      // Use word boundary check to avoid false positives
      const re = new RegExp(`\\b${other.name}\\b`);
      if (re.test(sym.signature ?? '') || (sym.kind !== 'class' && re.test(''))) {
        // Only add if meaningfully referenced — check signature level
        // This is a lightweight heuristic
      }
    }
  }

  return edges;
}

export function buildSymbolIdSet(symbols: SymbolNode[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const sym of symbols) {
    map.set(sym.id, sym.id);
  }
  return map;
}
