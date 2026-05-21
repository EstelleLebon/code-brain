"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidationGraph = void 0;
/**
 * Lightweight in-memory graph tracking which artifacts depend on which.
 */
class InvalidationGraph {
    dependents = new Map();
    /** Track that artifactId depends on each id in dependsOn. */
    track(artifactId, dependsOn) {
        for (const dep of dependsOn) {
            if (!this.dependents.has(dep)) {
                this.dependents.set(dep, new Set());
            }
            this.dependents.get(dep).add(artifactId);
        }
    }
    /** Get all artifacts that are impacted when artifactId changes. */
    getImpacted(artifactId) {
        return Array.from(this.dependents.get(artifactId) ?? []);
    }
    clear() {
        this.dependents.clear();
    }
}
exports.InvalidationGraph = InvalidationGraph;
//# sourceMappingURL=InvalidationGraph.js.map