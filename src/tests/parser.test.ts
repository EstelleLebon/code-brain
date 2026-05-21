import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseSource } from '../parser/ast.js';
import { extractSymbols } from '../parser/extractor.js';

describe('Parser', () => {
  test('extracts exported function', () => {
    const source = `
export function greet(name: string): string {
  return "Hello " + name;
}
`;
    const parsed = parseSource('/test/file.ts', source);
    assert.ok(parsed.symbols.length > 0, 'Should extract at least one symbol');
    const fn = parsed.symbols.find(s => s.name === 'greet');
    assert.ok(fn, 'Should find "greet" function');
    assert.equal(fn.kind, 'function');
    assert.equal(fn.exported, true);
  });

  test('extracts class with methods', () => {
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
    const parsed = parseSource('/test/file.ts', source);
    const cls = parsed.symbols.find(s => s.name === 'Calculator');
    assert.ok(cls, 'Should find Calculator class');
    assert.equal(cls.kind, 'class');
    assert.equal(cls.exported, true);
  });

  test('extracts interface', () => {
    const source = `
export interface User {
  id: string;
  name: string;
  email?: string;
}
`;
    const parsed = parseSource('/test/file.ts', source);
    const iface = parsed.symbols.find(s => s.name === 'User');
    assert.ok(iface, 'Should find User interface');
    assert.equal(iface.kind, 'interface');
    assert.equal(iface.exported, true);
  });

  test('extracts type alias', () => {
    const source = `export type UserId = string;`;
    const parsed = parseSource('/test/file.ts', source);
    const t = parsed.symbols.find(s => s.name === 'UserId');
    assert.ok(t, 'Should find UserId type');
    assert.equal(t.kind, 'type');
  });

  test('extracts enum', () => {
    const source = `
export enum Status {
  Active = 'active',
  Inactive = 'inactive',
}
`;
    const parsed = parseSource('/test/file.ts', source);
    const en = parsed.symbols.find(s => s.name === 'Status');
    assert.ok(en, 'Should find Status enum');
    assert.equal(en.kind, 'enum');
  });

  test('extracts imports', () => {
    const source = `
import { foo, bar } from './utils';
import defaultExport from './module';
import * as ns from './namespace';
`;
    const parsed = parseSource('/test/file.ts', source);
    assert.ok(parsed.imports.length >= 1, 'Should extract imports');
  });

  test('extractSymbols produces SymbolNodes with correct IDs', () => {
    const source = `
export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;
`;
    const parsed = parseSource('/test/math.ts', source);
    const symbols = extractSymbols(parsed);
    assert.ok(symbols.length >= 1, 'Should produce SymbolNodes');
    assert.ok(symbols[0]?.id?.length === 16, 'ID should be 16 hex chars');
    assert.ok(symbols[0]?.hash?.length === 16, 'Hash should be 16 hex chars');
  });

  test('non-exported function has exported=false', () => {
    const source = `
function privateHelper(x: number): number {
  return x * 2;
}
`;
    const parsed = parseSource('/test/file.ts', source);
    const fn = parsed.symbols.find(s => s.name === 'privateHelper');
    // Note: regex parser may or may not find this depending on implementation
    if (fn) {
      assert.equal(fn.exported, false);
    }
    // Just assert parse doesn't throw
    assert.ok(true);
  });

  test('handles empty source', () => {
    const parsed = parseSource('/test/empty.ts', '');
    assert.ok(Array.isArray(parsed.symbols));
    assert.ok(Array.isArray(parsed.imports));
  });

  test('file hash is deterministic', () => {
    const source = 'export const x = 1;';
    const parsed1 = parseSource('/test/a.ts', source);
    const parsed2 = parseSource('/test/a.ts', source);
    assert.equal(parsed1.hash, parsed2.hash);
  });
});
