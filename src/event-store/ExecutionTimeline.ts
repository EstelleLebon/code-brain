import {
  CognitiveEvent,
  StepExecutedEvent,
  RecoveryTriggeredEvent,
  RollbackAppliedEvent,
  ModeSwitchedEvent,
} from './CognitiveEvent.js';

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

export class TimelineBuilder {
  build(events: readonly CognitiveEvent[]): ExecutionTimeline {
    if (events.length === 0) {
      const now = new Date();
      return { executionId: '', roots: [], totalEvents: 0, startedAt: now, endedAt: now };
    }

    const executionId = events[0].executionId;
    const nodeMap = new Map<string, TimelineNode>();

    for (const e of events) {
      nodeMap.set(e.id, { event: e, children: [] });
    }

    const roots: TimelineNode[] = [];
    for (const e of events) {
      const node = nodeMap.get(e.id)!;
      if (e.causationId && nodeMap.has(e.causationId)) {
        nodeMap.get(e.causationId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return {
      executionId,
      roots,
      totalEvents: events.length,
      startedAt: events[0].timestamp,
      endedAt: events[events.length - 1].timestamp,
    };
  }

  criticalMoments(events: readonly CognitiveEvent[]): CriticalMoment[] {
    const moments: CriticalMoment[] = [];

    for (const e of events) {
      if (e.eventType === 'step:executed') {
        const s = e as StepExecutedEvent;
        if (s.payload.outcome === 'failure') {
          moments.push({ event: e, reason: `Step failed: ${s.payload.error ?? 'unknown'}` });
        }
      } else if (e.eventType === 'recovery:triggered') {
        moments.push({ event: e, reason: `Recovery: ${(e as RecoveryTriggeredEvent).payload.reason}` });
      } else if (e.eventType === 'rollback:applied') {
        const r = e as RollbackAppliedEvent;
        moments.push({ event: e, reason: `Rollback depth ${r.payload.depth}` });
      } else if (e.eventType === 'constraint:violated') {
        moments.push({ event: e, reason: 'Constraint violated' });
      }
    }

    return moments;
  }

  failures(events: readonly CognitiveEvent[]): StepExecutedEvent[] {
    return events
      .filter((e): e is StepExecutedEvent =>
        e.eventType === 'step:executed' && (e as StepExecutedEvent).payload.outcome === 'failure'
      );
  }

  recoveries(events: readonly CognitiveEvent[]): RecoveryTriggeredEvent[] {
    return events.filter((e): e is RecoveryTriggeredEvent => e.eventType === 'recovery:triggered');
  }

  modeTransitions(events: readonly CognitiveEvent[]): ModeTransition[] {
    return events
      .filter((e): e is ModeSwitchedEvent => e.eventType === 'mode:switched')
      .map(e => ({
        from: e.payload.fromMode,
        to: e.payload.toMode,
        reason: e.payload.reason,
        at: e.timestamp,
      }));
  }

  rollbackDepth(events: readonly CognitiveEvent[]): number {
    return events
      .filter((e): e is RollbackAppliedEvent => e.eventType === 'rollback:applied')
      .reduce((max, e) => Math.max(max, e.payload.depth), 0);
  }

  durationByPhase(events: readonly CognitiveEvent[]): Map<string, number> {
    const durations = new Map<string, number>();
    for (const e of events) {
      if (e.eventType === 'step:executed') {
        const s = e as StepExecutedEvent;
        const prev = durations.get('step:executed') ?? 0;
        durations.set('step:executed', prev + s.payload.durationMs);
      }
    }
    return durations;
  }
}
