export type FaultType =
  | 'runtime_timeout'
  | 'memory_pressure'
  | 'random_failure'
  | 'corrupted_retrieval'
  | 'trust_drift'
  | 'event_loss'
  | 'partial_rollback'
  | 'stale_snapshot';

export interface FaultScenario {
  id: string;
  faultType: FaultType;
  probability: number; // 0–1
  executionId?: string; // scope to specific execution, or undefined = global
  durationMs?: number; // auto-clear after this duration
  metadata?: Record<string, unknown>;
}

export interface InjectedFault {
  id: string;
  scenario: FaultScenario;
  injectedAt: Date;
  clearedAt?: Date;
  triggerCount: number;
}

export interface FaultInjectionResult {
  triggered: boolean;
  fault?: InjectedFault;
  reason?: string;
}

let _idCounter = 0;
function nextId(): string {
  return `fault-${++_idCounter}-${Date.now()}`;
}

export class FaultInjector {
  private _faults = new Map<string, InjectedFault>();
  private _seed: number | undefined;
  private _rngState: number;

  constructor(seed?: number) {
    this._seed = seed;
    this._rngState = seed ?? Math.floor(Math.random() * 2 ** 31);
  }

  // Seeded LCG for deterministic mode
  private _rand(): number {
    if (this._seed === undefined) return Math.random();
    this._rngState = (this._rngState * 1664525 + 1013904223) & 0xffffffff;
    return (this._rngState >>> 0) / 0x100000000;
  }

  inject(scenario: FaultScenario): InjectedFault {
    const fault: InjectedFault = {
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

  clear(faultId: string): boolean {
    const fault = this._faults.get(faultId);
    if (!fault) return false;
    fault.clearedAt = new Date();
    this._faults.delete(faultId);
    return true;
  }

  clearAll(): void {
    this._faults.clear();
  }

  activeFaults(executionId?: string): InjectedFault[] {
    const all = [...this._faults.values()];
    if (executionId === undefined) return all;
    return all.filter(f => f.scenario.executionId === undefined || f.scenario.executionId === executionId);
  }

  /**
   * Check whether a given fault type should trigger for this execution.
   * Respects probability and executionId scoping.
   */
  shouldTrigger(faultType: FaultType, executionId?: string): FaultInjectionResult {
    const candidates = this.activeFaults(executionId).filter(
      f => f.scenario.faultType === faultType,
    );
    if (candidates.length === 0) return { triggered: false };

    for (const fault of candidates) {
      if (this._rand() < fault.scenario.probability) {
        fault.triggerCount++;
        return { triggered: true, fault };
      }
    }
    return { triggered: false, reason: 'probability_miss' };
  }

  resetSeed(seed: number): void {
    this._seed = seed;
    this._rngState = seed;
  }
}
