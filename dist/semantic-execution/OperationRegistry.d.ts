import { SemanticOperationType } from '../semantic-ir/types.js';
import { ASTMutation } from '../ast-runtime/ASTMutation.js';
import { SemanticOperation } from '../semantic-ir/types.js';
import { EngineContext } from '../ast-runtime/TransformationEngine.js';
export type OperationHandler = (operation: SemanticOperation, ctx: EngineContext) => ASTMutation[];
export declare class OperationRegistry {
    private handlers;
    private engine;
    constructor();
    register(type: SemanticOperationType, handler: OperationHandler): void;
    get(type: SemanticOperationType): OperationHandler | undefined;
    has(type: SemanticOperationType): boolean;
    supportedTypes(): SemanticOperationType[];
}
//# sourceMappingURL=OperationRegistry.d.ts.map