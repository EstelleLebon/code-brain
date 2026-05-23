"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorClock = void 0;
class VectorClock {
    clock;
    constructor(initial) {
        this.clock = initial ? new Map(initial) : new Map();
    }
    increment(nodeId) {
        this.clock.set(nodeId, (this.clock.get(nodeId) ?? 0) + 1);
    }
    merge(other) {
        const merged = new Map(this.clock);
        for (const [nodeId, value] of other.clock) {
            merged.set(nodeId, Math.max(merged.get(nodeId) ?? 0, value));
        }
        return new VectorClock(merged);
    }
    compare(other) {
        const allKeys = new Set([...this.clock.keys(), ...other.clock.keys()]);
        let thisLess = false;
        let otherLess = false;
        for (const key of allKeys) {
            const a = this.clock.get(key) ?? 0;
            const b = other.clock.get(key) ?? 0;
            if (a < b)
                thisLess = true;
            if (a > b)
                otherLess = true;
        }
        if (!thisLess && !otherLess)
            return 'equal';
        if (thisLess && !otherLess)
            return 'before';
        if (!thisLess && otherLess)
            return 'after';
        return 'concurrent';
    }
    concurrent(other) {
        return this.compare(other) === 'concurrent';
    }
    causalBefore(other) {
        return this.compare(other) === 'before';
    }
    toJSON() {
        return Object.fromEntries(this.clock);
    }
    static fromJSON(data) {
        return new VectorClock(new Map(Object.entries(data)));
    }
}
exports.VectorClock = VectorClock;
//# sourceMappingURL=VectorClock.js.map