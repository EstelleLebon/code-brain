"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRegistry = void 0;
class NodeRegistry {
    nodes = new Map();
    tickCounter = 0;
    heartbeatTimeout;
    constructor(heartbeatTimeout = 10) {
        this.heartbeatTimeout = heartbeatTimeout;
    }
    register(node) {
        this.nodes.set(node.nodeId, {
            node,
            registeredAt: this.tickCounter,
            lastSeen: this.tickCounter,
            isolated: false,
        });
    }
    unregister(nodeId) { this.nodes.delete(nodeId); }
    getNode(nodeId) {
        return this.nodes.get(nodeId)?.node;
    }
    tick() {
        this.tickCounter++;
        for (const [, entry] of this.nodes) {
            const health = entry.node.heartbeat();
            entry.lastSeen = health.lastHeartbeat > 0 ? this.tickCounter : entry.lastSeen;
            if (this.tickCounter - entry.lastSeen > this.heartbeatTimeout) {
                entry.node.markFailed();
            }
        }
    }
    healthyNodes() {
        return [...this.nodes.values()]
            .filter(e => !e.isolated && e.node.getHealth().status === 'healthy')
            .map(e => e.node);
    }
    availableNodes() {
        return [...this.nodes.values()]
            .filter(e => !e.isolated && ['healthy', 'degraded'].includes(e.node.getHealth().status))
            .map(e => e.node);
    }
    leastLoaded() {
        const available = this.availableNodes();
        if (available.length === 0)
            return undefined;
        return available.reduce((min, n) => n.getLoad() < min.getLoad() ? n : min);
    }
    isolateNode(nodeId) {
        const entry = this.nodes.get(nodeId);
        if (entry) {
            entry.isolated = true;
            entry.node.markIsolated();
        }
    }
    unisolateNode(nodeId) {
        const entry = this.nodes.get(nodeId);
        if (entry)
            entry.isolated = false;
    }
    getAllHealth() {
        return [...this.nodes.values()].map(e => e.node.getHealth());
    }
    size() { return this.nodes.size; }
}
exports.NodeRegistry = NodeRegistry;
//# sourceMappingURL=NodeRegistry.js.map