"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessmentEngine = void 0;
const BASE_SCORES = {
    rename_symbol: 10,
    move_function: 30,
    extract_interface: 20,
    split_module: 60,
    inject_dependency: 50,
};
function scoreToLevel(score) {
    if (score < 25)
        return 'low';
    if (score < 50)
        return 'medium';
    if (score < 75)
        return 'high';
    return 'critical';
}
class RiskAssessmentEngine {
    assess(operation, context) {
        const reasons = [];
        let score = BASE_SCORES[operation.operationType] ?? 30;
        reasons.push(`Base risk for '${operation.operationType}': ${score}`);
        // More target symbols = more blast radius
        if (operation.targetSymbols.length > 1) {
            const delta = (operation.targetSymbols.length - 1) * 5;
            score += delta;
            reasons.push(`+${delta} for ${operation.targetSymbols.length} target symbols`);
        }
        if (context) {
            if (context.affectedFileCount && context.affectedFileCount > 3) {
                const delta = (context.affectedFileCount - 3) * 5;
                score += delta;
                reasons.push(`+${delta} for ${context.affectedFileCount} affected files`);
            }
            if (context.dependencyDepth && context.dependencyDepth > 2) {
                const delta = (context.dependencyDepth - 2) * 8;
                score += delta;
                reasons.push(`+${delta} for dependency depth ${context.dependencyDepth}`);
            }
            if (context.referencingSymbolCount && context.referencingSymbolCount > 5) {
                const delta = (context.referencingSymbolCount - 5) * 3;
                score += delta;
                reasons.push(`+${delta} for ${context.referencingSymbolCount} referencing symbols`);
            }
        }
        score = Math.min(100, score);
        return { score, level: scoreToLevel(score), reasons };
    }
    assessMany(operations) {
        if (operations.length === 0)
            return { score: 0, level: 'low', reasons: ['No operations'] };
        const assessments = operations.map(op => this.assess(op));
        const maxScore = Math.max(...assessments.map(a => a.score));
        const combinedScore = Math.min(100, maxScore + (operations.length - 1) * 5);
        return {
            score: combinedScore,
            level: scoreToLevel(combinedScore),
            reasons: [
                `${operations.length} operations combined`,
                ...assessments.flatMap((a, i) => [`[op ${i}] ${a.reasons[0]}`]),
            ],
        };
    }
}
exports.RiskAssessmentEngine = RiskAssessmentEngine;
//# sourceMappingURL=RiskAssessmentEngine.js.map