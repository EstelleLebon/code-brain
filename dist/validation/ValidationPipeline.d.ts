import { ValidationResult, ValidationCheck, ValidationContext } from './types.js';
export declare class ValidationPipeline {
    private checks;
    addCheck(check: ValidationCheck): void;
    run(context: ValidationContext): ValidationResult;
}
//# sourceMappingURL=ValidationPipeline.d.ts.map