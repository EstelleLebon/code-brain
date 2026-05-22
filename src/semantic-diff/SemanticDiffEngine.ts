import { SemanticDiff, OperationDiff, ImpactSummary } from './SemanticDiff.js';
import { SemanticOperation } from '../semantic-ir/types.js';

function extractExportedNames(source: string): Set<string> {
  const names = new Set<string>();
  const pattern = /export\s+(?:function|class|const|interface|type|enum)\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(source)) !== null) {
    if (m[1]) names.add(m[1]);
  }
  return names;
}

function countLines(source: string): number {
  return source.split('\n').length;
}

export class SemanticDiffEngine {
  computeOperationDiff(
    filePath: string,
    originalSource: string,
    transformedSource: string,
    operation: SemanticOperation
  ): OperationDiff {
    const originalExports = extractExportedNames(originalSource);
    const transformedExports = extractExportedNames(transformedSource);

    const symbolsAdded = [...transformedExports].filter(n => !originalExports.has(n));
    const symbolsRemoved = [...originalExports].filter(n => !transformedExports.has(n));
    const symbolsRenamed: Array<{ from: string; to: string }> = [];

    if (operation.operationType === 'rename_symbol' && operation.targetSymbols.length > 0) {
      const oldName = operation.targetSymbols[0]!;
      const newName = (operation as unknown as { payload?: { newName?: string } }).payload?.newName;
      if (newName && originalExports.has(oldName) && transformedExports.has(newName)) {
        symbolsRenamed.push({ from: oldName, to: newName });
      }
    }

    const linesAdded = Math.max(0, countLines(transformedSource) - countLines(originalSource));
    const linesRemoved = Math.max(0, countLines(originalSource) - countLines(transformedSource));

    return {
      operationId: operation.id,
      filePath,
      linesAdded,
      linesRemoved,
      symbolsAdded,
      symbolsRemoved,
      symbolsRenamed,
    };
  }

  computeSemanticDiff(operation: SemanticOperation, diffs: OperationDiff[]): SemanticDiff {
    const structuralImpact: string[] = [];

    for (const d of diffs) {
      if (d.symbolsAdded.length > 0) structuralImpact.push(`Added: ${d.symbolsAdded.join(', ')} in ${d.filePath}`);
      if (d.symbolsRemoved.length > 0) structuralImpact.push(`Removed: ${d.symbolsRemoved.join(', ')} from ${d.filePath}`);
      if (d.symbolsRenamed.length > 0) {
        structuralImpact.push(...d.symbolsRenamed.map(r => `Renamed: ${r.from} → ${r.to} in ${d.filePath}`));
      }
    }

    return {
      operationId: operation.id,
      operationType: operation.operationType,
      affectedSymbols: operation.targetSymbols,
      structuralImpact,
      filePaths: [...new Set(diffs.map(d => d.filePath))],
      timestamp: Date.now(),
    };
  }

  summarizeImpact(diffs: OperationDiff[]): ImpactSummary {
    const addedSymbols = [...new Set(diffs.flatMap(d => d.symbolsAdded))];
    const removedSymbols = [...new Set(diffs.flatMap(d => d.symbolsRemoved))];
    const renamedSymbols = diffs.flatMap(d => d.symbolsRenamed);
    const structuralChanges: string[] = [];

    for (const d of diffs) {
      if (d.linesAdded > 0) structuralChanges.push(`+${d.linesAdded} lines in ${d.filePath}`);
      if (d.linesRemoved > 0) structuralChanges.push(`-${d.linesRemoved} lines in ${d.filePath}`);
    }

    return {
      totalFilesAffected: new Set(diffs.map(d => d.filePath)).size,
      totalSymbolsAffected: addedSymbols.length + removedSymbols.length + renamedSymbols.length,
      addedSymbols,
      removedSymbols,
      renamedSymbols,
      structuralChanges,
    };
  }
}
