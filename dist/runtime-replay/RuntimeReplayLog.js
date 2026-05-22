"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeReplayLog = void 0;
const RuntimeReplayEvent_js_1 = require("./RuntimeReplayEvent.js");
class RuntimeReplayLog {
    events = [];
    record(operationId, runtimeSignals, outcomeId, causedRollback, metadata) {
        const event = {
            id: (0, RuntimeReplayEvent_js_1.makeReplayEventId)(),
            operationId,
            runtimeSignals,
            outcomeId,
            causedRollback,
            timestamp: Date.now(),
            metadata,
        };
        this.events.push(event);
        return event;
    }
    query(q = {}) {
        return this.events.filter(e => {
            if (q.operationId !== undefined && e.operationId !== q.operationId)
                return false;
            if (q.causedRollback !== undefined && e.causedRollback !== q.causedRollback)
                return false;
            if (q.since !== undefined && e.timestamp < q.since)
                return false;
            if (q.outcomeId !== undefined && e.outcomeId !== q.outcomeId)
                return false;
            return true;
        });
    }
    forOperation(operationId) {
        return this.query({ operationId });
    }
    rollbacks() {
        return this.query({ causedRollback: true });
    }
    all() {
        return [...this.events];
    }
    clear() {
        this.events = [];
    }
}
exports.RuntimeReplayLog = RuntimeReplayLog;
//# sourceMappingURL=RuntimeReplayLog.js.map