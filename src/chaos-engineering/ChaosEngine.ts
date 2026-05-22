import { FaultInjector, FaultType } from '../stress-testing/FaultInjection.js';
import { ChaosPolicy, ChaosPolicyLevel, CHAOS_POLICIES } from './ChaosPolicy.js';

export type CognitiveHealth = {
  trustScore: number;
  rollbackDepth: number;
  replanRate: number;
};

export type ChaosEngineStatus = 'idle' | 'running' | 'stopped' | 'aborted';

export interface ChaosTickResult {
  faultsInjected: number;
  policyLevel: ChaosPolicyLevel;
  aborted: boolean;
  reason?: string;
}

export class ChaosEngine {
  private _injector: FaultInjector;
  private _policy: ChaosPolicy;
  private _status: ChaosEngineStatus = 'idle';
  private _tickCount = 0;
  private _activeFaultIds: string[] = [];
  private _intervalHandle: ReturnType<typeof setInterval> | undefined;
  private _tickHistory: ChaosTickResult[] = [];

  constructor(
    injector?: FaultInjector,
    policyLevel: ChaosPolicyLevel = 'SAFE',
  ) {
    this._injector = injector ?? new FaultInjector();
    this._policy = CHAOS_POLICIES[policyLevel];
  }

  start(tickIntervalMs = 200): void {
    if (this._status === 'running') return;
    this._status = 'running';
    this._intervalHandle = setInterval(() => {
      this.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
    }, tickIntervalMs);
  }

  stop(): void {
    if (this._intervalHandle !== undefined) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = undefined;
    }
    this._injector.clearAll();
    this._activeFaultIds = [];
    this._status = 'stopped';
  }

  tick(health: CognitiveHealth): ChaosTickResult {
    if (this._status !== 'running' && this._status !== 'idle') {
      return { faultsInjected: 0, policyLevel: this._policy.level, aborted: false };
    }

    this._tickCount++;

    // Auto-abort on catastrophic instability
    if (this._shouldAbort(health)) {
      this.stop();
      this._status = 'aborted';
      const result: ChaosTickResult = {
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
      const faultType: FaultType = allowed[i % allowed.length];
      const fault = this._injector.inject({
        id: `chaos-${this._tickCount}-${i}`,
        faultType,
        probability: this._policy.faultProbabilityMultiplier,
        durationMs: 500,
      });
      this._activeFaultIds.push(fault.id);
      injected++;
    }

    const result: ChaosTickResult = {
      faultsInjected: injected,
      policyLevel: this._policy.level,
      aborted: false,
    };
    this._tickHistory.push(result);
    return result;
  }

  applyPolicy(level: ChaosPolicyLevel): void {
    this._policy = CHAOS_POLICIES[level];
  }

  status(): ChaosEngineStatus {
    return this._status;
  }

  policy(): ChaosPolicy {
    return { ...this._policy };
  }

  tickHistory(): ChaosTickResult[] {
    return [...this._tickHistory];
  }

  injector(): FaultInjector {
    return this._injector;
  }

  private _shouldAbort(health: CognitiveHealth): boolean {
    const t = this._policy.autoAbortThresholds;
    return (
      health.trustScore < t.minTrustScore ||
      health.rollbackDepth > t.maxRollbackDepth ||
      health.replanRate > t.maxReplanRate
    );
  }
}
