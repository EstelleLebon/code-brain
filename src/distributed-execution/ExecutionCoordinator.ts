import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';

export interface SyncPoint {
  syncId: string;
  requiredPartitions: string[];
  completedPartitions: Set<string>;
  resolvedAt?: number;
}

export interface DependencyBarrier {
  barrierId: string;
  blockedPartition: string;
  waitingFor: string[];
  released: boolean;
}

export class ExecutionCoordinator {
  private syncPoints: Map<string, SyncPoint> = new Map();
  private barriers: Map<string, DependencyBarrier> = new Map();
  private clock = 0;

  constructor(private _bus: DistributedEventBus) {}

  createSyncPoint(syncId: string, requiredPartitions: string[]): SyncPoint {
    const sp: SyncPoint = { syncId, requiredPartitions, completedPartitions: new Set() };
    this.syncPoints.set(syncId, sp);
    return sp;
  }

  markPartitionComplete(syncId: string, partitionId: string): boolean {
    const sp = this.syncPoints.get(syncId);
    if (!sp) return false;
    sp.completedPartitions.add(partitionId);
    const allDone = sp.requiredPartitions.every(p => sp.completedPartitions.has(p));
    if (allDone) sp.resolvedAt = this.clock++;
    return allDone;
  }

  createBarrier(barrierId: string, blockedPartition: string, waitingFor: string[]): DependencyBarrier {
    const barrier: DependencyBarrier = { barrierId, blockedPartition, waitingFor, released: false };
    this.barriers.set(barrierId, barrier);
    return barrier;
  }

  releaseBarrier(barrierId: string, completedPartition: string): boolean {
    const barrier = this.barriers.get(barrierId);
    if (!barrier) return false;
    barrier.waitingFor = barrier.waitingFor.filter(p => p !== completedPartition);
    if (barrier.waitingFor.length === 0) {
      barrier.released = true;
      return true;
    }
    return false;
  }

  isBarrierReleased(barrierId: string): boolean {
    return this.barriers.get(barrierId)?.released ?? false;
  }

  createCheckpoint(executionId: string, _partitionIds: string[]): string {
    return `checkpoint-${executionId}-${this.clock++}`;
  }

  getSyncPoint(syncId: string): SyncPoint | undefined { return this.syncPoints.get(syncId); }
  getBarrier(barrierId: string): DependencyBarrier | undefined { return this.barriers.get(barrierId); }
  getBus(): DistributedEventBus { return this._bus; }
}
