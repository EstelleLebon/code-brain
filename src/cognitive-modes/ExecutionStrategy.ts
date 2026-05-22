import { CognitiveMode } from './CognitiveMode.js';
import type { RiskLevel } from '../risk/RiskAssessmentEngine.js';

export interface ExecutionStrategy {
  mode: CognitiveMode;
  maxMutations: number;
  validationDepth: 'none' | 'basic' | 'full';
  requiresRuntimePipeline: boolean;
  autoApproveMaxRisk: RiskLevel;
  rollbackAggressiveness: 'lazy' | 'eager' | 'immediate';
  retrievalStrictness: 'relaxed' | 'normal' | 'strict';
}

export const STRATEGIES: Record<CognitiveMode, ExecutionStrategy> = {
  [CognitiveMode.EXPLORATION]: {
    mode: CognitiveMode.EXPLORATION,
    maxMutations: 5,
    validationDepth: 'basic',
    requiresRuntimePipeline: false,
    autoApproveMaxRisk: 'low',
    rollbackAggressiveness: 'lazy',
    retrievalStrictness: 'relaxed',
  },
  [CognitiveMode.SAFE_REFACTOR]: {
    mode: CognitiveMode.SAFE_REFACTOR,
    maxMutations: 20,
    validationDepth: 'full',
    requiresRuntimePipeline: true,
    autoApproveMaxRisk: 'low',
    rollbackAggressiveness: 'eager',
    retrievalStrictness: 'strict',
  },
  [CognitiveMode.AGGRESSIVE_OPTIMIZATION]: {
    mode: CognitiveMode.AGGRESSIVE_OPTIMIZATION,
    maxMutations: 100,
    validationDepth: 'basic',
    requiresRuntimePipeline: false,
    autoApproveMaxRisk: 'medium',
    rollbackAggressiveness: 'lazy',
    retrievalStrictness: 'normal',
  },
  [CognitiveMode.HOTFIX]: {
    mode: CognitiveMode.HOTFIX,
    maxMutations: 3,
    validationDepth: 'full',
    requiresRuntimePipeline: true,
    autoApproveMaxRisk: 'low',
    rollbackAggressiveness: 'immediate',
    retrievalStrictness: 'strict',
  },
  [CognitiveMode.LEARNING]: {
    mode: CognitiveMode.LEARNING,
    maxMutations: 10,
    validationDepth: 'full',
    requiresRuntimePipeline: true,
    autoApproveMaxRisk: 'low',
    rollbackAggressiveness: 'eager',
    retrievalStrictness: 'normal',
  },
  [CognitiveMode.RECOVERY]: {
    mode: CognitiveMode.RECOVERY,
    maxMutations: 1,
    validationDepth: 'full',
    requiresRuntimePipeline: true,
    autoApproveMaxRisk: 'low',
    rollbackAggressiveness: 'immediate',
    retrievalStrictness: 'strict',
  },
};

export function getStrategy(mode: CognitiveMode): ExecutionStrategy {
  return STRATEGIES[mode];
}
