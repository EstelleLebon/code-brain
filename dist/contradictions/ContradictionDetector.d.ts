import { Claim } from '../types/index.js';
import { Contradiction, ContradictionReport } from './types.js';
export declare class ContradictionDetector {
    private handlers;
    detect(claims: Claim[]): Contradiction[];
    report(contradictions: Contradiction[]): ContradictionReport;
    onDetected(handler: (c: Contradiction) => void): void;
}
//# sourceMappingURL=ContradictionDetector.d.ts.map