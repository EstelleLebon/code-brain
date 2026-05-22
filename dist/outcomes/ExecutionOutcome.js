"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeOutcomeId = makeOutcomeId;
function makeOutcomeId() {
    return `outcome-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
//# sourceMappingURL=ExecutionOutcome.js.map