"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationPipeline = void 0;
// ── Built-in checks ───────────────────────────────────────────────────────────
const symbolCollisionCheck = {
    name: 'symbol_collision',
    run(ctx) {
        const errors = [];
        for (const sym of ctx.affectedSymbols) {
            // Detect duplicate export declarations in transformed source
            const exportPattern = new RegExp(`export\\s+(?:function|class|const|interface|type|enum)\\s+${escapeRegex(sym)}\\b`, 'g');
            const matches = ctx.transformedSource.match(exportPattern);
            if (matches && matches.length > 1) {
                errors.push(`Symbol collision: '${sym}' is exported ${matches.length} times in ${ctx.filePath}`);
            }
        }
        return { passed: errors.length === 0, errors, warnings: [], riskDelta: errors.length * 20 };
    },
};
const importBreakaageCheck = {
    name: 'import_breakage',
    run(ctx) {
        const warnings = [];
        if (!ctx.allFiles || !ctx.allTransformedFiles)
            return { passed: true, errors: [], warnings, riskDelta: 0 };
        for (const sym of ctx.affectedSymbols) {
            // Find files that import the affected symbol
            for (const [fp, src] of ctx.allFiles) {
                if (fp === ctx.filePath)
                    continue;
                if (src.includes(`{ ${sym}`) || src.includes(`, ${sym}`) || src.includes(`${sym} }`)) {
                    // Check that the transformed source still exports it
                    if (!ctx.transformedSource.includes(`export`) || !ctx.transformedSource.includes(sym)) {
                        warnings.push(`Potential import breakage: '${sym}' imported in ${fp} may no longer be exported from ${ctx.filePath}`);
                    }
                }
            }
        }
        return { passed: true, errors: [], warnings, riskDelta: warnings.length * 10 };
    },
};
const orphanReferenceCheck = {
    name: 'orphan_references',
    run(ctx) {
        const warnings = [];
        // Look for references to removed symbols in transformed source
        const originalExports = extractExportedNames(ctx.source);
        const transformedExports = extractExportedNames(ctx.transformedSource);
        for (const name of originalExports) {
            if (!transformedExports.has(name)) {
                const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
                if (pattern.test(ctx.transformedSource)) {
                    warnings.push(`Orphan reference: '${name}' was exported but still referenced in ${ctx.filePath}`);
                }
            }
        }
        return { passed: true, errors: [], warnings, riskDelta: warnings.length * 5 };
    },
};
const syntaxIntegrityCheck = {
    name: 'syntax_integrity',
    run(ctx) {
        const errors = [];
        // Basic brace/paren balance check
        const open = (ctx.transformedSource.match(/\{/g) ?? []).length;
        const close = (ctx.transformedSource.match(/\}/g) ?? []).length;
        if (open !== close) {
            errors.push(`Syntax imbalance in ${ctx.filePath}: ${open} '{' vs ${close} '}'`);
        }
        const openP = (ctx.transformedSource.match(/\(/g) ?? []).length;
        const closeP = (ctx.transformedSource.match(/\)/g) ?? []).length;
        if (openP !== closeP) {
            errors.push(`Syntax imbalance in ${ctx.filePath}: ${openP} '(' vs ${closeP} ')'`);
        }
        return { passed: errors.length === 0, errors, warnings: [], riskDelta: errors.length * 30 };
    },
};
// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function extractExportedNames(source) {
    const names = new Set();
    const pattern = /export\s+(?:function|class|const|interface|type|enum)\s+(\w+)/g;
    let m;
    while ((m = pattern.exec(source)) !== null) {
        if (m[1])
            names.add(m[1]);
    }
    return names;
}
// ── Pipeline ─────────────────────────────────────────────────────────────────
class ValidationPipeline {
    checks = [
        syntaxIntegrityCheck,
        symbolCollisionCheck,
        importBreakaageCheck,
        orphanReferenceCheck,
    ];
    addCheck(check) {
        this.checks.push(check);
    }
    run(context) {
        const errors = [];
        const warnings = [];
        let riskScore = 0;
        for (const check of this.checks) {
            let result;
            try {
                result = check.run(context);
            }
            catch (err) {
                warnings.push(`Check '${check.name}' threw: ${err instanceof Error ? err.message : String(err)}`);
                continue;
            }
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            riskScore += result.riskDelta;
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            riskScore: Math.min(100, riskScore),
        };
    }
}
exports.ValidationPipeline = ValidationPipeline;
//# sourceMappingURL=ValidationPipeline.js.map