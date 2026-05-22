import { ASTMutation } from './ASTMutation.js';
import { SemanticOperation } from '../semantic-ir/types.js';
export interface EngineContext {
    filePath: string;
    source: string;
    allFiles?: Map<string, string>;
}
export declare class TransformationEngine {
    planMutations(operation: SemanticOperation, ctx: EngineContext): ASTMutation[];
    private planRename;
    private planMoveFunction;
    private planExtractInterface;
}
//# sourceMappingURL=TransformationEngine.d.ts.map