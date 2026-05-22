import { SemanticOperation, SemanticOperationType, SemanticTransformation } from './types.js';

export class SemanticIR {
  private transformations: SemanticTransformation[] = [];

  createOperation(
    operationType: SemanticOperationType,
    targetSymbols: string[],
    constraints: string[] = [],
    expectedEffects: string[] = []
  ): SemanticOperation {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      operationType,
      targetSymbols,
      constraints,
      expectedEffects,
      createdAt: Date.now(),
    };
  }

  planTransformation(operations: SemanticOperation[]): SemanticTransformation {
    const transformation: SemanticTransformation = {
      id: `xfm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      operations,
      status: 'planned',
      createdAt: Date.now(),
    };
    this.transformations.push(transformation);
    return transformation;
  }

  validate(transformation: SemanticTransformation): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const op of transformation.operations) {
      if (op.targetSymbols.length === 0) {
        issues.push(`Operation ${op.id} (${op.operationType}) has no target symbols`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  getTransformations(): SemanticTransformation[] { return [...this.transformations]; }
}
