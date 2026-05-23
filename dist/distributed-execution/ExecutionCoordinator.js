"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionCoordinator = void 0;
class ExecutionCoordinator {
    _bus;
    syncPoints = new Map();
    barriers = new Map();
    clock = 0;
    constructor(_bus) {
        this._bus = _bus;
    }
    createSyncPoint(syncId, requiredPartitions) {
        const sp = { syncId, requiredPartitions, completedPartitions: new Set() };
        this.syncPoints.set(syncId, sp);
        return sp;
    }
    markPartitionComplete(syncId, partitionId) {
        const sp = this.syncPoints.get(syncId);
        if (!sp)
            return false;
        sp.completedPartitions.add(partitionId);
        const allDone = sp.requiredPartitions.every(p => sp.completedPartitions.has(p));
        if (allDone)
            sp.resolvedAt = this.clock++;
        return allDone;
    }
    createBarrier(barrierId, blockedPartition, waitingFor) {
        const barrier = { barrierId, blockedPartition, waitingFor, released: false };
        this.barriers.set(barrierId, barrier);
        return barrier;
    }
    releaseBarrier(barrierId, completedPartition) {
        const barrier = this.barriers.get(barrierId);
        if (!barrier)
            return false;
        barrier.waitingFor = barrier.waitingFor.filter(p => p !== completedPartition);
        if (barrier.waitingFor.length === 0) {
            barrier.released = true;
            return true;
        }
        return false;
    }
    isBarrierReleased(barrierId) {
        return this.barriers.get(barrierId)?.released ?? false;
    }
    createCheckpoint(executionId, _partitionIds) {
        return `checkpoint-${executionId}-${this.clock++}`;
    }
    getSyncPoint(syncId) { return this.syncPoints.get(syncId); }
    getBarrier(barrierId) { return this.barriers.get(barrierId); }
    getBus() { return this._bus; }
}
exports.ExecutionCoordinator = ExecutionCoordinator;
//# sourceMappingURL=ExecutionCoordinator.js.map