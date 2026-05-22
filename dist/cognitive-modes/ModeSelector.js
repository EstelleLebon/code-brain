"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeSelector = void 0;
const CognitiveMode_js_1 = require("./CognitiveMode.js");
const ExecutionStrategy_js_1 = require("./ExecutionStrategy.js");
class ModeSelector {
    select(ctx) {
        // Hotfix overrides everything
        if (ctx.isHotfix)
            return CognitiveMode_js_1.CognitiveMode.HOTFIX;
        // Recovery: too many failures or runtime instability
        if (ctx.recentFailures >= 3 || (ctx.runtimeInstability && ctx.recentFailures >= 1)) {
            return CognitiveMode_js_1.CognitiveMode.RECOVERY;
        }
        // LEARNING: degrading signal with runtime pipeline active
        if (ctx.learningSignal?.recentTrend === 'degrading') {
            return CognitiveMode_js_1.CognitiveMode.LEARNING;
        }
        // Critical risk → safe refactor
        if (ctx.calibratedRisk === 'critical' || ctx.calibratedRisk === 'high') {
            return CognitiveMode_js_1.CognitiveMode.SAFE_REFACTOR;
        }
        // Stable zone with high confidence → aggressive optimization
        if (ctx.calibratedRisk === 'low' &&
            ctx.recentSuccesses >= 5 &&
            ctx.recentFailures === 0 &&
            ctx.retrievalConfidence > 0.7) {
            return CognitiveMode_js_1.CognitiveMode.AGGRESSIVE_OPTIMIZATION;
        }
        // Unknown territory → explore
        if (ctx.retrievalConfidence < 0.3) {
            return CognitiveMode_js_1.CognitiveMode.EXPLORATION;
        }
        return CognitiveMode_js_1.CognitiveMode.SAFE_REFACTOR;
    }
    selectWithStrategy(ctx) {
        const mode = this.select(ctx);
        return { mode, strategy: (0, ExecutionStrategy_js_1.getStrategy)(mode) };
    }
}
exports.ModeSelector = ModeSelector;
//# sourceMappingURL=ModeSelector.js.map