"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationRegistry = void 0;
const TransformationEngine_js_1 = require("../ast-runtime/TransformationEngine.js");
class OperationRegistry {
    handlers = new Map();
    engine = new TransformationEngine_js_1.TransformationEngine();
    constructor() {
        // Register built-in handlers backed by TransformationEngine
        this.register('rename_symbol', (op, ctx) => this.engine.planMutations(op, ctx));
        this.register('move_function', (op, ctx) => this.engine.planMutations(op, ctx));
        this.register('extract_interface', (op, ctx) => this.engine.planMutations(op, ctx));
    }
    register(type, handler) {
        this.handlers.set(type, handler);
    }
    get(type) {
        return this.handlers.get(type);
    }
    has(type) {
        return this.handlers.has(type);
    }
    supportedTypes() {
        return [...this.handlers.keys()];
    }
}
exports.OperationRegistry = OperationRegistry;
//# sourceMappingURL=OperationRegistry.js.map