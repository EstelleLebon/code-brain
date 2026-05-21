export type ContradictionSeverity = 'low' | 'medium' | 'high';
export type ContradictionKind = 'claim_vs_claim' | 'chunk_vs_ast' | 'runtime_vs_claim' | 'type_mismatch' | 'signature_drift';
export interface Contradiction {
    id: string;
    kind: ContradictionKind;
    severity: ContradictionSeverity;
    sourceA: string;
    sourceB: string;
    description: string;
    detectedAt: number;
    resolved: boolean;
}
export interface ContradictionReport {
    contradictions: Contradiction[];
    totalCount: number;
    bySeverity: Record<ContradictionSeverity, number>;
    byKind: Record<ContradictionKind, number>;
}
//# sourceMappingURL=types.d.ts.map