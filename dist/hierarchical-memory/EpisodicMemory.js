"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicMemory = void 0;
function makeId() {
    return `ep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
/**
 * Records significant events: critical transformations, failures, recoveries, sessions.
 * Stored in-memory with optional size cap; notable episodes persist via SQLite if wired.
 */
class EpisodicMemory {
    episodes = [];
    maxSize;
    constructor(maxSize = 500) {
        this.maxSize = maxSize;
    }
    record(type, title, summary, tags = [], metadata = {}) {
        const episode = { id: makeId(), type, title, summary, tags, timestamp: Date.now(), metadata };
        this.episodes.push(episode);
        if (this.episodes.length > this.maxSize)
            this.episodes.shift();
        return episode;
    }
    search(type, tag) {
        return this.episodes.filter(e => {
            if (type && e.type !== type)
                return false;
            if (tag && !e.tags.includes(tag))
                return false;
            return true;
        });
    }
    recent(limit = 10) {
        return [...this.episodes].slice(-limit).reverse();
    }
    all() {
        return [...this.episodes];
    }
    size() {
        return this.episodes.length;
    }
}
exports.EpisodicMemory = EpisodicMemory;
//# sourceMappingURL=EpisodicMemory.js.map