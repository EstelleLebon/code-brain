export interface RetrievalReliabilitySignal {
    chunkId: string;
    successRate: number;
    failureRate: number;
    runtimeConfidence: number;
}
export declare class AdaptiveRetrievalPolicy {
    private stats;
    recordSuccess(chunkId: string): void;
    recordFailure(chunkId: string): void;
    getSignal(chunkId: string): RetrievalReliabilitySignal;
    reliabilityScore(chunkId: string): number;
    rankByReliability(chunkIds: string[]): string[];
    allSignals(): RetrievalReliabilitySignal[];
    private getOrCreate;
}
//# sourceMappingURL=AdaptiveRetrievalPolicy.d.ts.map