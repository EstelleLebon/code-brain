import { SemanticDiff, OperationDiff, ImpactSummary } from './SemanticDiff.js';
import { SemanticOperation } from '../semantic-ir/types.js';
export declare class SemanticDiffEngine {
    computeOperationDiff(filePath: string, originalSource: string, transformedSource: string, operation: SemanticOperation): OperationDiff;
    computeSemanticDiff(operation: SemanticOperation, diffs: OperationDiff[]): SemanticDiff;
    summarizeImpact(diffs: OperationDiff[]): ImpactSummary;
}
//# sourceMappingURL=SemanticDiffEngine.d.ts.map