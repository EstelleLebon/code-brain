import { CognitiveEvent, StepExecutedEvent, RecoveryTriggeredEvent } from './CognitiveEvent.js';
export interface TimelineNode {
    readonly event: CognitiveEvent;
    readonly children: TimelineNode[];
    readonly durationMs?: number;
}
export interface CriticalMoment {
    readonly event: CognitiveEvent;
    readonly reason: string;
}
export interface ModeTransition {
    readonly from: string;
    readonly to: string;
    readonly reason: string;
    readonly at: Date;
}
export interface ExecutionTimeline {
    readonly executionId: string;
    readonly roots: TimelineNode[];
    readonly totalEvents: number;
    readonly startedAt: Date;
    readonly endedAt: Date;
}
export declare class TimelineBuilder {
    build(events: readonly CognitiveEvent[]): ExecutionTimeline;
    criticalMoments(events: readonly CognitiveEvent[]): CriticalMoment[];
    failures(events: readonly CognitiveEvent[]): StepExecutedEvent[];
    recoveries(events: readonly CognitiveEvent[]): RecoveryTriggeredEvent[];
    modeTransitions(events: readonly CognitiveEvent[]): ModeTransition[];
    rollbackDepth(events: readonly CognitiveEvent[]): number;
    durationByPhase(events: readonly CognitiveEvent[]): Map<string, number>;
}
//# sourceMappingURL=ExecutionTimeline.d.ts.map