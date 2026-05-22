export interface SemanticDiff {
  operationId: string;
  operationType: string;
  affectedSymbols: string[];
  structuralImpact: string[];
  filePaths: string[];
  timestamp: number;
}

export interface OperationDiff {
  operationId: string;
  filePath: string;
  linesAdded: number;
  linesRemoved: number;
  symbolsAdded: string[];
  symbolsRemoved: string[];
  symbolsRenamed: Array<{ from: string; to: string }>;
}

export interface ImpactSummary {
  totalFilesAffected: number;
  totalSymbolsAffected: number;
  addedSymbols: string[];
  removedSymbols: string[];
  renamedSymbols: Array<{ from: string; to: string }>;
  structuralChanges: string[];
}
