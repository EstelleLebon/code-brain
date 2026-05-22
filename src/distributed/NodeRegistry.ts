import type { CognitiveNode, NodeHealth } from './CognitiveNode.js';

export interface RegistryEntry {
  node: CognitiveNode;
  registeredAt: number;
  lastSeen: number;
  isolated: boolean;
}

export class NodeRegistry {
  private nodes: Map<string, RegistryEntry> = new Map();
  private tickCounter = 0;
  private heartbeatTimeout: number;

  constructor(heartbeatTimeout = 10) {
    this.heartbeatTimeout = heartbeatTimeout;
  }

  register(node: CognitiveNode): void {
    this.nodes.set(node.nodeId, {
      node,
      registeredAt: this.tickCounter,
      lastSeen: this.tickCounter,
      isolated: false,
    });
  }

  unregister(nodeId: string): void { this.nodes.delete(nodeId); }

  getNode(nodeId: string): CognitiveNode | undefined {
    return this.nodes.get(nodeId)?.node;
  }

  tick(): void {
    this.tickCounter++;
    for (const [, entry] of this.nodes) {
      const health = entry.node.heartbeat();
      entry.lastSeen = health.lastHeartbeat > 0 ? this.tickCounter : entry.lastSeen;
      if (this.tickCounter - entry.lastSeen > this.heartbeatTimeout) {
        entry.node.markFailed();
      }
    }
  }

  healthyNodes(): CognitiveNode[] {
    return [...this.nodes.values()]
      .filter(e => !e.isolated && e.node.getHealth().status === 'healthy')
      .map(e => e.node);
  }

  availableNodes(): CognitiveNode[] {
    return [...this.nodes.values()]
      .filter(e => !e.isolated && ['healthy', 'degraded'].includes(e.node.getHealth().status))
      .map(e => e.node);
  }

  leastLoaded(): CognitiveNode | undefined {
    const available = this.availableNodes();
    if (available.length === 0) return undefined;
    return available.reduce((min, n) => n.getLoad() < min.getLoad() ? n : min);
  }

  isolateNode(nodeId: string): void {
    const entry = this.nodes.get(nodeId);
    if (entry) { entry.isolated = true; entry.node.markIsolated(); }
  }

  unisolateNode(nodeId: string): void {
    const entry = this.nodes.get(nodeId);
    if (entry) entry.isolated = false;
  }

  getAllHealth(): NodeHealth[] {
    return [...this.nodes.values()].map(e => e.node.getHealth());
  }

  size(): number { return this.nodes.size; }
}
