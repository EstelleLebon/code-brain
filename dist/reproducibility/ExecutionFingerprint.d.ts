export interface FingerprintComponent {
    label: string;
    value: string;
}
export interface ExecutionFingerprint {
    executionId: string;
    components: FingerprintComponent[];
    hash: string;
    createdAt: Date;
}
export interface FingerprintDiff {
    matching: string[];
    diverging: Array<{
        label: string;
        a: string;
        b: string;
    }>;
    identical: boolean;
    similarityScore: number;
}
export interface FingerprintInput {
    executionId: string;
    planTopology?: string;
    mutations?: string[];
    runtimeSignals?: Record<string, unknown>;
    events?: string[];
    cognitiveMode?: string;
    trustLevel?: number;
}
export declare function fingerprintExecution(input: FingerprintInput): ExecutionFingerprint;
export declare function compareFingerprints(a: ExecutionFingerprint, b: ExecutionFingerprint): FingerprintDiff;
//# sourceMappingURL=ExecutionFingerprint.d.ts.map