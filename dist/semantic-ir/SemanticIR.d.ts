import { SemanticOperation, SemanticOperationType, SemanticTransformation } from './types.js';
export declare class SemanticIR {
    private transformations;
    createOperation(operationType: SemanticOperationType, targetSymbols: string[], constraints?: string[], expectedEffects?: string[]): SemanticOperation;
    planTransformation(operations: SemanticOperation[]): SemanticTransformation;
    validate(transformation: SemanticTransformation): {
        valid: boolean;
        issues: string[];
    };
    getTransformations(): SemanticTransformation[];
}
//# sourceMappingURL=SemanticIR.d.ts.map