/**
 * Lightweight in-memory graph tracking which artifacts depend on which.
 */
export class InvalidationGraph {
  private dependents: Map<string, Set<string>> = new Map();

  /** Track that artifactId depends on each id in dependsOn. */
  track(artifactId: string, dependsOn: string[]): void {
    for (const dep of dependsOn) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, new Set());
      }
      this.dependents.get(dep)!.add(artifactId);
    }
  }

  /** Get all artifacts that are impacted when artifactId changes. */
  getImpacted(artifactId: string): string[] {
    return Array.from(this.dependents.get(artifactId) ?? []);
  }

  clear(): void {
    this.dependents.clear();
  }
}
