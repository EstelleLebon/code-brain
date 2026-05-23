"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkPartitionSimulator = void 0;
class NetworkPartitionSimulator {
    bus;
    registry;
    events = [];
    activePartitions = new Map();
    latencies = new Map();
    dropRates = new Map();
    clock = 0;
    seed;
    constructor(bus, registry, seed = 42) {
        this.bus = bus;
        this.registry = registry;
        this.seed = seed;
    }
    nextRand() {
        this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
        return Math.abs(this.seed) / 0x7fffffff;
    }
    partitionNode(nodeId, partitionId) {
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
    healPartition(partitionId) {
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
    injectLatency(nodeId, latencyTicks) {
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
    dropMessages(nodeId, dropRate) {
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
    simulateSplitBrain(nodeIds) {
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
    shouldDropMessage(nodeId) {
        const rate = this.dropRates.get(nodeId) ?? 0;
        return this.nextRand() < rate;
    }
    getActivePartitions() { return new Map(this.activePartitions); }
    getEvents() { return this.events; }
    isNodeIsolated(nodeId) {
        return this.activePartitions.size > 0 && [...this.activePartitions.values()].some(nodes => nodes.includes(nodeId));
    }
    createSplitBrain(groupA, groupB, seed) {
        const usedSeed = seed ?? this.seed;
        const pid = `split-brain-${usedSeed}-${this.clock}`;
        const pidA = `${pid}-a`;
        const pidB = `${pid}-b`;
        for (const nodeId of groupA) {
            this.bus.addPartition(pidA, [nodeId]);
            this.registry.isolateNode(nodeId);
        }
        for (const nodeId of groupB) {
            this.bus.addPartition(pidB, [nodeId]);
            this.registry.isolateNode(nodeId);
        }
        this.activePartitions.set(pidA, [...groupA]);
        this.activePartitions.set(pidB, [...groupB]);
        this.events.push({
            eventId: `ne-${this.clock}`,
            condition: 'split_brain',
            affectedNodes: [...groupA, ...groupB],
            parameters: { groupASize: groupA.length, groupBSize: groupB.length, seed: usedSeed },
            seed: usedSeed,
            timestamp: this.clock++,
        });
        return pid;
    }
    simulateQuorumLoss(nodeIds, quorumSize, seed) {
        const usedSeed = seed ?? this.seed;
        // Deterministically isolate nodes until quorum is lost
        let isolated = 0;
        for (const nodeId of nodeIds) {
            const pid = `quorum-loss-${usedSeed}-${this.clock}`;
            this.activePartitions.set(pid, [nodeId]);
            this.bus.addPartition(pid, [nodeId]);
            this.registry.isolateNode(nodeId);
            isolated++;
            this.events.push({
                eventId: `ne-${this.clock}`,
                condition: 'node_isolation',
                affectedNodes: [nodeId],
                parameters: { quorumLoss: 1, seed: usedSeed },
                seed: usedSeed,
                timestamp: this.clock++,
            });
            if (nodeIds.length - isolated < quorumSize) {
                return true;
            }
        }
        return false;
    }
    getActivePartitionIds() {
        return [...this.activePartitions.keys()];
    }
}
exports.NetworkPartitionSimulator = NetworkPartitionSimulator;
//# sourceMappingURL=NetworkPartitionSimulator.js.map