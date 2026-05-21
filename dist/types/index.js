"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBrainConfigSchema = exports.SymbolNodeSchema = exports.SymbolKindSchema = exports.TruthLevel = void 0;
const zod_1 = require("zod");
var TruthLevel;
(function (TruthLevel) {
    TruthLevel[TruthLevel["STRUCTURAL"] = 0] = "STRUCTURAL";
    TruthLevel[TruthLevel["DERIVED"] = 1] = "DERIVED";
    TruthLevel[TruthLevel["SEMANTIC"] = 2] = "SEMANTIC";
    TruthLevel[TruthLevel["HEURISTIC"] = 3] = "HEURISTIC";
})(TruthLevel || (exports.TruthLevel = TruthLevel = {}));
// Zod schemas for validation
exports.SymbolKindSchema = zod_1.z.enum([
    'function', 'class', 'interface', 'type', 'variable',
    'method', 'property', 'enum', 'namespace', 'export'
]);
exports.SymbolNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    kind: exports.SymbolKindSchema,
    filePath: zod_1.z.string(),
    startLine: zod_1.z.number().int().nonnegative(),
    endLine: zod_1.z.number().int().nonnegative(),
    signature: zod_1.z.string().optional(),
    exported: zod_1.z.boolean(),
    dependencies: zod_1.z.array(zod_1.z.string()),
    hash: zod_1.z.string(),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
});
exports.CodeBrainConfigSchema = zod_1.z.object({
    dbPath: zod_1.z.string().optional(),
    watchGlob: zod_1.z.string().optional(),
    embeddingDim: zod_1.z.number().int().positive().optional(),
    maxVocabSize: zod_1.z.number().int().positive().optional(),
    telemetry: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=index.js.map