import { SemanticOperationType } from '../semantic-ir/types.js';
import { ASTMutation } from '../ast-runtime/ASTMutation.js';
import { SemanticOperation } from '../semantic-ir/types.js';
import { EngineContext, TransformationEngine } from '../ast-runtime/TransformationEngine.js';

export type OperationHandler = (
  operation: SemanticOperation,
  ctx: EngineContext
) => ASTMutation[];

export class OperationRegistry {
  private handlers = new Map<SemanticOperationType, OperationHandler>();
  private engine = new TransformationEngine();

  constructor() {
    // Register built-in handlers backed by TransformationEngine
    this.register('rename_symbol', (op, ctx) => this.engine.planMutations(op, ctx));
    this.register('move_function', (op, ctx) => this.engine.planMutations(op, ctx));
    this.register('extract_interface', (op, ctx) => this.engine.planMutations(op, ctx));
  }

  register(type: SemanticOperationType, handler: OperationHandler): void {
    this.handlers.set(type, handler);
  }

  get(type: SemanticOperationType): OperationHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: SemanticOperationType): boolean {
    return this.handlers.has(type);
  }

  supportedTypes(): SemanticOperationType[] {
    return [...this.handlers.keys()];
  }
}
