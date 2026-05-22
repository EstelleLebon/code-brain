"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRATEGIES = void 0;
exports.getStrategy = getStrategy;
const CognitiveMode_js_1 = require("./CognitiveMode.js");
exports.STRATEGIES = {
    [CognitiveMode_js_1.CognitiveMode.EXPLORATION]: {
        mode: CognitiveMode_js_1.CognitiveMode.EXPLORATION,
        maxMutations: 5,
        validationDepth: 'basic',
        requiresRuntimePipeline: false,
        autoApproveMaxRisk: 'low',
        rollbackAggressiveness: 'lazy',
        retrievalStrictness: 'relaxed',
    },
    [CognitiveMode_js_1.CognitiveMode.SAFE_REFACTOR]: {
        mode: CognitiveMode_js_1.CognitiveMode.SAFE_REFACTOR,
        maxMutations: 20,
        validationDepth: 'full',
        requiresRuntimePipeline: true,
        autoApproveMaxRisk: 'low',
        rollbackAggressiveness: 'eager',
        retrievalStrictness: 'strict',
    },
    [CognitiveMode_js_1.CognitiveMode.AGGRESSIVE_OPTIMIZATION]: {
        mode: CognitiveMode_js_1.CognitiveMode.AGGRESSIVE_OPTIMIZATION,
        maxMutations: 100,
        validationDepth: 'basic',
        requiresRuntimePipeline: false,
        autoApproveMaxRisk: 'medium',
        rollbackAggressiveness: 'lazy',
        retrievalStrictness: 'normal',
    },
    [CognitiveMode_js_1.CognitiveMode.HOTFIX]: {
        mode: CognitiveMode_js_1.CognitiveMode.HOTFIX,
        maxMutations: 3,
        validationDepth: 'full',
        requiresRuntimePipeline: true,
        autoApproveMaxRisk: 'low',
        rollbackAggressiveness: 'immediate',
        retrievalStrictness: 'strict',
    },
    [CognitiveMode_js_1.CognitiveMode.LEARNING]: {
        mode: CognitiveMode_js_1.CognitiveMode.LEARNING,
        maxMutations: 10,
        validationDepth: 'full',
        requiresRuntimePipeline: true,
        autoApproveMaxRisk: 'low',
        rollbackAggressiveness: 'eager',
        retrievalStrictness: 'normal',
    },
    [CognitiveMode_js_1.CognitiveMode.RECOVERY]: {
        mode: CognitiveMode_js_1.CognitiveMode.RECOVERY,
        maxMutations: 1,
        validationDepth: 'full',
        requiresRuntimePipeline: true,
        autoApproveMaxRisk: 'low',
        rollbackAggressiveness: 'immediate',
        retrievalStrictness: 'strict',
    },
};
function getStrategy(mode) {
    return exports.STRATEGIES[mode];
}
//# sourceMappingURL=ExecutionStrategy.js.map