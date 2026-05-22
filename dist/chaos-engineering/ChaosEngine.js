"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosEngine = void 0;
const FaultInjection_js_1 = require("../stress-testing/FaultInjection.js");
const ChaosPolicy_js_1 = require("./ChaosPolicy.js");
class ChaosEngine {
    _injector;
    _policy;
    _status = 'idle';
    _tickCount = 0;
    _activeFaultIds = [];
    _intervalHandle;
    _tickHistory = [];
    constructor(injector, policyLevel = 'SAFE') {
        this._injector = injector ?? new FaultInjection_js_1.FaultInjector();
        this._policy = ChaosPolicy_js_1.CHAOS_POLICIES[policyLevel];
    }
    start(tickIntervalMs = 200) {
        if (this._status === 'running')
            return;
        this._status = 'running';
        this._intervalHandle = setInterval(() => {
            this.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
        }, tickIntervalMs);
    }
    stop() {
        if (this._intervalHandle !== undefined) {
            clearInterval(this._intervalHandle);
            this._intervalHandle = undefined;
        }
        this._injector.clearAll();
        this._activeFaultIds = [];
        this._status = 'stopped';
    }
    tick(health) {
        if (this._status !== 'running' && this._status !== 'idle') {
            return { faultsInjected: 0, policyLevel: this._policy.level, aborted: false };
        }
        this._tickCount++;
        // Auto-abort on catastrophic instability
        if (this._shouldAbort(health)) {
            this.stop();
            this._status = 'aborted';
            const result = {
                faultsInjected: 0,
                policyLevel: this._policy.level,
                aborted: true,
                reason: `catastrophic instability (trust=${health.trustScore.toFixed(2)}, depth=${health.rollbackDepth})`,
            };
            this._tickHistory.push(result);
            return result;
        }
        // Clear excess faults
        const current = this._injector.activeFaults();
        const excess = current.length - this._policy.maxConcurrentFaults;
        if (excess > 0 && current.length > 0) {
            for (let i = 0; i < excess; i++) {
                this._injector.clear(current[i].id);
            }
        }
        // Inject new faults up to policy limit
        const allowed = this._policy.allowedCorruption;
        const slotsAvailable = this._policy.maxConcurrentFaults - this._injector.activeFaults().length;
        let injected = 0;
        for (let i = 0; i < slotsAvailable && i < allowed.length; i++) {
            const faultType = allowed[i % allowed.length];
            const fault = this._injector.inject({
                id: `chaos-${this._tickCount}-${i}`,
                faultType,
                probability: this._policy.faultProbabilityMultiplier,
                durationMs: 500,
            });
            this._activeFaultIds.push(fault.id);
            injected++;
        }
        const result = {
            faultsInjected: injected,
            policyLevel: this._policy.level,
            aborted: false,
        };
        this._tickHistory.push(result);
        return result;
    }
    applyPolicy(level) {
        this._policy = ChaosPolicy_js_1.CHAOS_POLICIES[level];
    }
    status() {
        return this._status;
    }
    policy() {
        return { ...this._policy };
    }
    tickHistory() {
        return [...this._tickHistory];
    }
    injector() {
        return this._injector;
    }
    _shouldAbort(health) {
        const t = this._policy.autoAbortThresholds;
        return (health.trustScore < t.minTrustScore ||
            health.rollbackDepth > t.maxRollbackDepth ||
            health.replanRate > t.maxReplanRate);
    }
}
exports.ChaosEngine = ChaosEngine;
//# sourceMappingURL=ChaosEngine.js.map