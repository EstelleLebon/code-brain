import type { CognitiveMode } from '../cognitive-modes/CognitiveMode.js';
export interface ProceduralPattern {
    id: string;
    name: string;
    mode: CognitiveMode;
    operationSequence: string[];
    successRate: number;
    executionCount: number;
    avgDurationMs: number;
    lastUsed: number;
}
/**
 * Stores effective procedural strategies: which operation sequences work in which modes.
 */
export declare class ProceduralMemory {
    private patterns;
    record(name: string, mode: CognitiveMode, operationSequence: string[], success: boolean, durationMs: number): ProceduralPattern;
    find(name: string, mode: CognitiveMode): ProceduralPattern | undefined;
    bestForMode(mode: CognitiveMode, limit?: number): ProceduralPattern[];
    all(): ProceduralPattern[];
}
//# sourceMappingURL=ProceduralMemory.d.ts.map