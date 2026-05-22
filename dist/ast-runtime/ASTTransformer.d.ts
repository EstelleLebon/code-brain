import { ASTMutation } from './ASTMutation.js';
export interface TransformResult {
    source: string;
    changed: boolean;
    appliedCount: number;
}
export declare class ASTTransformer {
    /**
     * Applies mutations in reverse order (highest startIndex first) so earlier
     * mutations don't shift the character positions of later ones.
     */
    apply(source: string, mutations: ASTMutation[]): TransformResult;
    applyToFiles(fileMap: Map<string, string>, mutations: ASTMutation[]): Map<string, TransformResult>;
}
//# sourceMappingURL=ASTTransformer.d.ts.map