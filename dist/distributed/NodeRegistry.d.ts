import type { CognitiveNode, NodeHealth } from './CognitiveNode.js';
export interface RegistryEntry {
    node: CognitiveNode;
    registeredAt: number;
    lastSeen: number;
    isolated: boolean;
}
export declare class NodeRegistry {
    private nodes;
    private tickCounter;
    private heartbeatTimeout;
    constructor(heartbeatTimeout?: number);
    register(node: CognitiveNode): void;
    unregister(nodeId: string): void;
    getNode(nodeId: string): CognitiveNode | undefined;
    tick(): void;
    healthyNodes(): CognitiveNode[];
    availableNodes(): CognitiveNode[];
    leastLoaded(): CognitiveNode | undefined;
    isolateNode(nodeId: string): void;
    unisolateNode(nodeId: string): void;
    getAllHealth(): NodeHealth[];
    size(): number;
}
//# sourceMappingURL=NodeRegistry.d.ts.map