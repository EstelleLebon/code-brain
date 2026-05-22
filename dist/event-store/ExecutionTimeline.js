"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineBuilder = void 0;
class TimelineBuilder {
    build(events) {
        if (events.length === 0) {
            const now = new Date();
            return { executionId: '', roots: [], totalEvents: 0, startedAt: now, endedAt: now };
        }
        const executionId = events[0].executionId;
        const nodeMap = new Map();
        for (const e of events) {
            nodeMap.set(e.id, { event: e, children: [] });
        }
        const roots = [];
        for (const e of events) {
            const node = nodeMap.get(e.id);
            if (e.causationId && nodeMap.has(e.causationId)) {
                nodeMap.get(e.causationId).children.push(node);
            }
            else {
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
    criticalMoments(events) {
        const moments = [];
        for (const e of events) {
            if (e.eventType === 'step:executed') {
                const s = e;
                if (s.payload.outcome === 'failure') {
                    moments.push({ event: e, reason: `Step failed: ${s.payload.error ?? 'unknown'}` });
                }
            }
            else if (e.eventType === 'recovery:triggered') {
                moments.push({ event: e, reason: `Recovery: ${e.payload.reason}` });
            }
            else if (e.eventType === 'rollback:applied') {
                const r = e;
                moments.push({ event: e, reason: `Rollback depth ${r.payload.depth}` });
            }
            else if (e.eventType === 'constraint:violated') {
                moments.push({ event: e, reason: 'Constraint violated' });
            }
        }
        return moments;
    }
    failures(events) {
        return events
            .filter((e) => e.eventType === 'step:executed' && e.payload.outcome === 'failure');
    }
    recoveries(events) {
        return events.filter((e) => e.eventType === 'recovery:triggered');
    }
    modeTransitions(events) {
        return events
            .filter((e) => e.eventType === 'mode:switched')
            .map(e => ({
            from: e.payload.fromMode,
            to: e.payload.toMode,
            reason: e.payload.reason,
            at: e.timestamp,
        }));
    }
    rollbackDepth(events) {
        return events
            .filter((e) => e.eventType === 'rollback:applied')
            .reduce((max, e) => Math.max(max, e.payload.depth), 0);
    }
    durationByPhase(events) {
        const durations = new Map();
        for (const e of events) {
            if (e.eventType === 'step:executed') {
                const s = e;
                const prev = durations.get('step:executed') ?? 0;
                durations.set('step:executed', prev + s.payload.durationMs);
            }
        }
        return durations;
    }
}
exports.TimelineBuilder = TimelineBuilder;
//# sourceMappingURL=ExecutionTimeline.js.map