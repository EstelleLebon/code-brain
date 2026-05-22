import { ASTMutation } from '../ast-runtime/ASTMutation.js';
import { SemanticOperation } from '../semantic-ir/types.js';
export interface ExecutionStep {
    operationId: string;
    operation: SemanticOperation;
    mutations: ASTMutation[];
    estimatedFilesAffected: number;
}
export interface ExecutionPlan {
    transformationId: string;
    steps: ExecutionStep[];
    totalMutations: number;
    estimatedFilesAffected: number;
    createdAt: number;
}
//# sourceMappingURL=ExecutionPlan.d.ts.map