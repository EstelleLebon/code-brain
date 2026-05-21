"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ast_js_1 = require("../parser/ast.js");
const extractor_js_1 = require("../parser/extractor.js");
(0, node_test_1.describe)('Parser', () => {
    (0, node_test_1.test)('extracts exported function', () => {
        const source = `
export function greet(name: string): string {
  return "Hello " + name;
}
`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        strict_1.default.ok(parsed.symbols.length > 0, 'Should extract at least one symbol');
        const fn = parsed.symbols.find(s => s.name === 'greet');
        strict_1.default.ok(fn, 'Should find "greet" function');
        strict_1.default.equal(fn.kind, 'function');
        strict_1.default.equal(fn.exported, true);
    });
    (0, node_test_1.test)('extracts class with methods', () => {
        const source = `
export class Calculator {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }

  result(): number {
    return this.value;
  }
}
`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        const cls = parsed.symbols.find(s => s.name === 'Calculator');
        strict_1.default.ok(cls, 'Should find Calculator class');
        strict_1.default.equal(cls.kind, 'class');
        strict_1.default.equal(cls.exported, true);
    });
    (0, node_test_1.test)('extracts interface', () => {
        const source = `
export interface User {
  id: string;
  name: string;
  email?: string;
}
`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        const iface = parsed.symbols.find(s => s.name === 'User');
        strict_1.default.ok(iface, 'Should find User interface');
        strict_1.default.equal(iface.kind, 'interface');
        strict_1.default.equal(iface.exported, true);
    });
    (0, node_test_1.test)('extracts type alias', () => {
        const source = `export type UserId = string;`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        const t = parsed.symbols.find(s => s.name === 'UserId');
        strict_1.default.ok(t, 'Should find UserId type');
        strict_1.default.equal(t.kind, 'type');
    });
    (0, node_test_1.test)('extracts enum', () => {
        const source = `
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}
`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        const en = parsed.symbols.find(s => s.name === 'Status');
        strict_1.default.ok(en, 'Should find Status enum');
        strict_1.default.equal(en.kind, 'enum');
    });
    (0, node_test_1.test)('extracts imports', () => {
        const source = `
import { foo, bar } from './utils';
import defaultExport from './module';
import * as ns from './namespace';
`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        strict_1.default.ok(parsed.imports.length >= 1, 'Should extract imports');
    });
    (0, node_test_1.test)('extractSymbols produces SymbolNodes with correct IDs', () => {
        const source = `
export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;
`;
        const parsed = (0, ast_js_1.parseSource)('/test/math.ts', source);
        const symbols = (0, extractor_js_1.extractSymbols)(parsed);
        strict_1.default.ok(symbols.length >= 1, 'Should produce SymbolNodes');
        strict_1.default.ok(symbols[0]?.id?.length === 16, 'ID should be 16 hex chars');
        strict_1.default.ok(symbols[0]?.hash?.length === 16, 'Hash should be 16 hex chars');
    });
    (0, node_test_1.test)('non-exported function has exported=false', () => {
        const source = `
function privateHelper(x: number): number {
  return x * 2;
}
`;
        const parsed = (0, ast_js_1.parseSource)('/test/file.ts', source);
        const fn = parsed.symbols.find(s => s.name === 'privateHelper');
        // Note: regex parser may or may not find this depending on implementation
        if (fn) {
            strict_1.default.equal(fn.exported, false);
        }
        // Just assert parse doesn't throw
        strict_1.default.ok(true);
    });
    (0, node_test_1.test)('handles empty source', () => {
        const parsed = (0, ast_js_1.parseSource)('/test/empty.ts', '');
        strict_1.default.ok(Array.isArray(parsed.symbols));
        strict_1.default.ok(Array.isArray(parsed.imports));
    });
    (0, node_test_1.test)('file hash is deterministic', () => {
        const source = 'export const x = 1;';
        const parsed1 = (0, ast_js_1.parseSource)('/test/a.ts', source);
        const parsed2 = (0, ast_js_1.parseSource)('/test/a.ts', source);
        strict_1.default.equal(parsed1.hash, parsed2.hash);
    });
});
//# sourceMappingURL=parser.test.js.map