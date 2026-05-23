import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import type { NodeRegistry } from '../distributed/NodeRegistry.js';
export type NetworkCondition = 'latency' | 'packet_loss' | 'node_isolation' | 'split_brain' | 'delayed_delivery';
export interface NetworkEvent {
    eventId: string;
    condition: NetworkCondition;
    affectedNodes: string[];
    parameters: Record<string, number>;
    seed: number;
    timestamp: number;
}
export declare class NetworkPartitionSimulator {
    private bus;
    private registry;
    private events;
    private activePartitions;
    private latencies;
    private dropRates;
    private clock;
    private seed;
    constructor(bus: DistributedEventBus, registry: NodeRegistry, seed?: number);
    private nextRand;
    partitionNode(nodeId: string, partitionId?: string): string;
    healPartition(partitionId: string): void;
    injectLatency(nodeId: string, latencyTicks: number): void;
    dropMessages(nodeId: string, dropRate: number): void;
    simulateSplitBrain(nodeIds: string[]): {
        partitionA: string;
        partitionB: string;
    };
    shouldDropMessage(nodeId: string): boolean;
    getActivePartitions(): Map<string, string[]>;
    getEvents(): readonly NetworkEvent[];
    isNodeIsolated(nodeId: string): boolean;
    createSplitBrain(groupA: string[], groupB: string[], seed?: number): string;
    simulateQuorumLoss(nodeIds: string[], quorumSize: number, seed?: number): boolean;
    getActivePartitionIds(): string[];
}
//# sourceMappingURL=NetworkPartitionSimulator.d.ts.map