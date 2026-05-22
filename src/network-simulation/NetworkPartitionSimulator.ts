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

export class NetworkPartitionSimulator {
  private events: NetworkEvent[] = [];
  private activePartitions: Map<string, string[]> = new Map();
  private latencies: Map<string, number> = new Map();
  private dropRates: Map<string, number> = new Map();
  private clock = 0;
  private seed: number;

  constructor(private bus: DistributedEventBus, private registry: NodeRegistry, seed = 42) {
    this.seed = seed;
  }

  private nextRand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(this.seed) / 0x7fffffff;
  }

  partitionNode(nodeId: string, partitionId?: string): string {
    const pid = partitionId ?? `partition-${this.clock}`;
    const existing = this.activePartitions.get(pid) ?? [];
    existing.push(nodeId);
    this.activePartitions.set(pid, existing);

    this.bus.addPartition(pid, existing);
    this.registry.isolateNode(nodeId);

    this.events.push({
      eventId: `ne-${this.clock}`,
      condition: 'node_isolation',
      affectedNodes: [nodeId],
      parameters: { partitionId: this.clock },
      seed: this.seed,
      timestamp: this.clock++,
    });
    return pid;
  }

  healPartition(partitionId: string): void {
    const nodes = this.activePartitions.get(partitionId) ?? [];
    this.activePartitions.delete(partitionId);
    this.bus.removePartition(partitionId);
    for (const nodeId of nodes) {
      this.registry.unisolateNode(nodeId);
    }
    this.events.push({
      eventId: `ne-${this.clock}`,
      condition: 'node_isolation',
      affectedNodes: nodes,
      parameters: { healed: 1 },
      seed: this.seed,
      timestamp: this.clock++,
    });
  }

  injectLatency(nodeId: string, latencyTicks: number): void {
    this.latencies.set(nodeId, latencyTicks);
    this.events.push({
      eventId: `ne-${this.clock}`,
      condition: 'latency',
      affectedNodes: [nodeId],
      parameters: { latencyTicks },
      seed: this.seed,
      timestamp: this.clock++,
    });
  }

  dropMessages(nodeId: string, dropRate: number): void {
    this.dropRates.set(nodeId, Math.max(0, Math.min(1, dropRate)));
    this.events.push({
      eventId: `ne-${this.clock}`,
      condition: 'packet_loss',
      affectedNodes: [nodeId],
      parameters: { dropRate },
      seed: this.seed,
      timestamp: this.clock++,
    });
  }

  simulateSplitBrain(nodeIds: string[]): { partitionA: string; partitionB: string } {
    const mid = Math.floor(nodeIds.length / 2);
    const groupA = nodeIds.slice(0, Math.max(1, mid));
    const groupB = nodeIds.slice(Math.max(1, mid));

    const pidA = `split-a-${this.clock}`;
    const pidB = `split-b-${this.clock}`;

    for (const nodeId of groupA) {
      this.bus.addPartition(pidA, [nodeId]);
      this.registry.isolateNode(nodeId);
    }
    for (const nodeId of groupB) {
      this.bus.addPartition(pidB, [nodeId]);
      this.registry.isolateNode(nodeId);
    }

    this.activePartitions.set(pidA, groupA);
    this.activePartitions.set(pidB, groupB);

    this.events.push({
      eventId: `ne-${this.clock}`,
      condition: 'split_brain',
      affectedNodes: nodeIds,
      parameters: { groupASize: groupA.length, groupBSize: groupB.length },
      seed: this.seed,
      timestamp: this.clock++,
    });

    return { partitionA: pidA, partitionB: pidB };
  }

  shouldDropMessage(nodeId: string): boolean {
    const rate = this.dropRates.get(nodeId) ?? 0;
    return this.nextRand() < rate;
  }

  getActivePartitions(): Map<string, string[]> { return new Map(this.activePartitions); }
  getEvents(): readonly NetworkEvent[] { return this.events; }
  isNodeIsolated(nodeId: string): boolean {
    return this.activePartitions.size > 0 && [...this.activePartitions.values()].some(nodes => nodes.includes(nodeId));
  }
}
