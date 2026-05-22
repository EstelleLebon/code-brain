"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeReplayEventId = makeReplayEventId;
function makeReplayEventId() {
    return `rre-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
//# sourceMappingURL=RuntimeReplayEvent.js.map