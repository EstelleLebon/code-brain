import {
  ValidationResult,
  ValidationCheck,
  ValidationCheckResult,
  ValidationContext,
} from './types.js';

// ── Built-in checks ───────────────────────────────────────────────────────────

const symbolCollisionCheck: ValidationCheck = {
  name: 'symbol_collision',
  run(ctx: ValidationContext): ValidationCheckResult {
    const errors: string[] = [];
    for (const sym of ctx.affectedSymbols) {
      // Detect duplicate export declarations in transformed source
      const exportPattern = new RegExp(
        `export\\s+(?:function|class|const|interface|type|enum)\\s+${escapeRegex(sym)}\\b`,
        'g'
      );
      const matches = ctx.transformedSource.match(exportPattern);
      if (matches && matches.length > 1) {
        errors.push(`Symbol collision: '${sym}' is exported ${matches.length} times in ${ctx.filePath}`);
      }
    }
    return { passed: errors.length === 0, errors, warnings: [], riskDelta: errors.length * 20 };
  },
};

const importBreakaageCheck: ValidationCheck = {
  name: 'import_breakage',
  run(ctx: ValidationContext): ValidationCheckResult {
    const warnings: string[] = [];
    if (!ctx.allFiles || !ctx.allTransformedFiles) return { passed: true, errors: [], warnings, riskDelta: 0 };

    for (const sym of ctx.affectedSymbols) {
      // Find files that import the affected symbol
      for (const [fp, src] of ctx.allFiles) {
        if (fp === ctx.filePath) continue;
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

const orphanReferenceCheck: ValidationCheck = {
  name: 'orphan_references',
  run(ctx: ValidationContext): ValidationCheckResult {
    const warnings: string[] = [];
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

const syntaxIntegrityCheck: ValidationCheck = {
  name: 'syntax_integrity',
  run(ctx: ValidationContext): ValidationCheckResult {
    const errors: string[] = [];
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractExportedNames(source: string): Set<string> {
  const names = new Set<string>();
  const pattern = /export\s+(?:function|class|const|interface|type|enum)\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(source)) !== null) {
    if (m[1]) names.add(m[1]);
  }
  return names;
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

export class ValidationPipeline {
  private checks: ValidationCheck[] = [
    syntaxIntegrityCheck,
    symbolCollisionCheck,
    importBreakaageCheck,
    orphanReferenceCheck,
  ];

  addCheck(check: ValidationCheck): void {
    this.checks.push(check);
  }

  run(context: ValidationContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    for (const check of this.checks) {
      let result: ValidationCheckResult;
      try {
        result = check.run(context);
      } catch (err) {
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
