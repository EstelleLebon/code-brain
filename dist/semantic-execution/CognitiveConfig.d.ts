import type { RuntimeValidationPipeline } from '../runtime-validation/RuntimeValidationPipeline.js';
import type { RuntimeLearningEngine } from '../learning/RuntimeLearningEngine.js';
import type { RuntimeReplayLog } from '../runtime-replay/RuntimeReplayLog.js';
import type { OutcomeAnalyzer } from '../outcomes/OutcomeAnalyzer.js';
import type { CognitiveFeedbackLoop } from '../cognitive-loop/CognitiveFeedbackLoop.js';
import type { SelfHealingEngine } from '../self-healing/SelfHealingEngine.js';
import type { ModeSelector } from '../cognitive-modes/ModeSelector.js';
import type { MetricsAggregator } from '../metrics/MetricsAggregator.js';
/**
 * Optional cognitive subsystems wired into SemanticExecutor.executeAsync().
 * All fields are optional — omitting a subsystem silently skips that stage.
 */
export interface CognitiveConfig {
    validationPipeline?: RuntimeValidationPipeline;
    outcomeAnalyzer?: OutcomeAnalyzer;
    learningEngine?: RuntimeLearningEngine;
    runtimeReplayLog?: RuntimeReplayLog;
    feedbackLoop?: CognitiveFeedbackLoop;
    selfHealingEngine?: SelfHealingEngine;
    modeSelector?: ModeSelector;
    metricsAggregator?: MetricsAggregator;
}
//# sourceMappingURL=CognitiveConfig.d.ts.map