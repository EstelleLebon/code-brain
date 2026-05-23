export type NetworkScenarioType = 'partition' | 'delayed_delivery' | 'dropped_messages' | 'duplicated_delivery' | 'split_brain' | 'quorum_loss' | 'leader_isolation';
export interface ChaosNetworkScenario {
    scenarioId: string;
    type: NetworkScenarioType;
    seed: number;
    targetNodes: string[];
    durationMs: number;
    intensity: number;
    parameters: Record<string, unknown>;
}
export interface NetworkScenarioResult {
    scenarioId: string;
    type: NetworkScenarioType;
    affectedNodes: string[];
    messagesDropped: number;
    messagesDuplicated: number;
    partitionsCreated: number;
    recoveryTriggered: boolean;
    deterministicSeed: number;
}
//# sourceMappingURL=ChaosNetworkScenario.d.ts.map