"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecutionContext = createExecutionContext;
function createExecutionContext(transformationId, workingDirectory, files, dryRun = true) {
    return { transformationId, workingDirectory, dryRun, files };
}
//# sourceMappingURL=ExecutionContext.js.map