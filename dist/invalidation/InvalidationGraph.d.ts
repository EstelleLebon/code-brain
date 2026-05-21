/**
 * Lightweight in-memory graph tracking which artifacts depend on which.
 */
export declare class InvalidationGraph {
    private dependents;
    /** Track that artifactId depends on each id in dependsOn. */
    track(artifactId: string, dependsOn: string[]): void;
    /** Get all artifacts that are impacted when artifactId changes. */
    getImpacted(artifactId: string): string[];
    clear(): void;
}
//# sourceMappingURL=InvalidationGraph.d.ts.map