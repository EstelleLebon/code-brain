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
export declare class ExecutionCoordinator {
    private _bus;
    private syncPoints;
    private barriers;
    private clock;
    constructor(_bus: DistributedEventBus);
    createSyncPoint(syncId: string, requiredPartitions: string[]): SyncPoint;
    markPartitionComplete(syncId: string, partitionId: string): boolean;
    createBarrier(barrierId: string, blockedPartition: string, waitingFor: string[]): DependencyBarrier;
    releaseBarrier(barrierId: string, completedPartition: string): boolean;
    isBarrierReleased(barrierId: string): boolean;
    createCheckpoint(executionId: string, _partitionIds: string[]): string;
    getSyncPoint(syncId: string): SyncPoint | undefined;
    getBarrier(barrierId: string): DependencyBarrier | undefined;
    getBus(): DistributedEventBus;
}
//# sourceMappingURL=ExecutionCoordinator.d.ts.map