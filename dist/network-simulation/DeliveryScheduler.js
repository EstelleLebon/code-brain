"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryScheduler = void 0;
class DeliveryScheduler {
    queue = [];
    clock = 0;
    seed;
    constructor(seed = 42) {
        this.seed = seed;
    }
    nextRand() {
        this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
        return Math.abs(this.seed) / 0x7fffffff;
    }
    schedule(payload, sourceNodeId, targetNodeId, delay = 0) {
        const msg = {
            messageId: `msg-${this.clock}`,
            payload,
            sourceNodeId,
            targetNodeId,
            scheduledAt: this.clock,
            deliverAt: this.clock + delay,
            delivered: false,
        };
        this.queue.push(msg);
        return msg;
    }
    scheduleWithJitter(payload, sourceNodeId, targetNodeId, baseDelay, jitterMax) {
        const jitter = Math.floor(this.nextRand() * jitterMax);
        return this.schedule(payload, sourceNodeId, targetNodeId, baseDelay + jitter);
    }
    tick() {
        this.clock++;
        const due = this.queue.filter(m => !m.delivered && m.deliverAt <= this.clock);
        due.sort((a, b) => a.messageId.localeCompare(b.messageId));
        for (const m of due)
            m.delivered = true;
        return due;
    }
    getPending() {
        return this.queue.filter(m => !m.delivered).sort((a, b) => a.deliverAt - b.deliverAt);
    }
    getClock() { return this.clock; }
    getAllMessages() { return this.queue; }
}
exports.DeliveryScheduler = DeliveryScheduler;
//# sourceMappingURL=DeliveryScheduler.js.map