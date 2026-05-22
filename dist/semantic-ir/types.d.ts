export type SemanticOperationType = 'extract_interface' | 'rename_symbol' | 'split_module' | 'move_function' | 'inject_dependency';
export interface SemanticOperation {
    id: string;
    operationType: SemanticOperationType;
    targetSymbols: string[];
    constraints: string[];
    expectedEffects: string[];
    createdAt: number;
}
export interface SemanticTransformation {
    id: string;
    operations: SemanticOperation[];
    status: 'planned' | 'validated' | 'applied' | 'rolled_back';
    createdAt: number;
}
//# sourceMappingURL=types.d.ts.map