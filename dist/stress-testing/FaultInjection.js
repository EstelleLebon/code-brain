"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaultInjector = void 0;
let _idCounter = 0;
function nextId() {
    return `fault-${++_idCounter}-${Date.now()}`;
}
class FaultInjector {
    _faults = new Map();
    _seed;
    _rngState;
    constructor(seed) {
        this._seed = seed;
        this._rngState = seed ?? Math.floor(Math.random() * 2 ** 31);
    }
    // Seeded LCG for deterministic mode
    _rand() {
        if (this._seed === undefined)
            return Math.random();
        this._rngState = (this._rngState * 1664525 + 1013904223) & 0xffffffff;
        return (this._rngState >>> 0) / 0x100000000;
    }
    inject(scenario) {
        const fault = {
            id: nextId(),
            scenario,
            injectedAt: new Date(),
            triggerCount: 0,
        };
        this._faults.set(fault.id, fault);
        if (scenario.durationMs !== undefined) {
            setTimeout(() => this.clear(fault.id), scenario.durationMs);
        }
        return fault;
    }
    clear(faultId) {
        const fault = this._faults.get(faultId);
        if (!fault)
            return false;
        fault.clearedAt = new Date();
        this._faults.delete(faultId);
        return true;
    }
    clearAll() {
        this._faults.clear();
    }
    activeFaults(executionId) {
        const all = [...this._faults.values()];
        if (executionId === undefined)
            return all;
        return all.filter(f => f.scenario.executionId === undefined || f.scenario.executionId === executionId);
    }
    /**
     * Check whether a given fault type should trigger for this execution.
     * Respects probability and executionId scoping.
     */
    shouldTrigger(faultType, executionId) {
        const candidates = this.activeFaults(executionId).filter(f => f.scenario.faultType === faultType);
        if (candidates.length === 0)
            return { triggered: false };
        for (const fault of candidates) {
            if (this._rand() < fault.scenario.probability) {
                fault.triggerCount++;
                return { triggered: true, fault };
            }
        }
        return { triggered: false, reason: 'probability_miss' };
    }
    resetSeed(seed) {
        this._seed = seed;
        this._rngState = seed;
    }
}
exports.FaultInjector = FaultInjector;
//# sourceMappingURL=FaultInjection.js.map