export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
}
export interface ValidationCheck {
    name: string;
    run(context: ValidationContext): ValidationCheckResult;
}
export interface ValidationCheckResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    riskDelta: number;
}
export interface ValidationContext {
    filePath: string;
    source: string;
    transformedSource: string;
    affectedSymbols: string[];
    allFiles?: Map<string, string>;
    allTransformedFiles?: Map<string, string>;
}
//# sourceMappingURL=types.d.ts.map