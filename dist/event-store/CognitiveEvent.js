"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeEventId = makeEventId;
exports.createEvent = createEvent;
let _seq = 0;
function makeEventId() {
    return `evt-${Date.now()}-${++_seq}`;
}
function createEvent(partial) {
    return {
        id: partial.id ?? makeEventId(),
        timestamp: partial.timestamp ?? new Date(),
        ...partial,
    };
}
//# sourceMappingURL=CognitiveEvent.js.map