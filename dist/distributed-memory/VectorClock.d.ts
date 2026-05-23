export declare class VectorClock {
    private clock;
    constructor(initial?: Map<string, number>);
    increment(nodeId: string): void;
    merge(other: VectorClock): VectorClock;
    compare(other: VectorClock): 'before' | 'after' | 'equal' | 'concurrent';
    concurrent(other: VectorClock): boolean;
    causalBefore(other: VectorClock): boolean;
    toJSON(): Record<string, number>;
    static fromJSON(data: Record<string, number>): VectorClock;
}
//# sourceMappingURL=VectorClock.d.ts.map