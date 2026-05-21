import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { ParsedFile, RawSymbol, RawImport, SymbolKind } from '../types/index.js';

// Try to load tree-sitter; fall back to regex parser if unavailable
let Parser: typeof import('tree-sitter') | null = null;
let TypeScriptLang: unknown = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Parser = require('tree-sitter');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tsModule = require('tree-sitter-typescript');
  TypeScriptLang = tsModule.typescript ?? tsModule;
} catch {
  // Tree-sitter not available; will use regex fallback
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ── Tree-sitter parser ────────────────────────────────────────────────────────

function extractNodeText(node: import('tree-sitter').SyntaxNode, source: string): string {
  return source.slice(node.startIndex, node.endIndex);
}

function getFirstLine(text: string): string {
  return text.split('\n')[0]?.trim() ?? '';
}

function isExported(node: import('tree-sitter').SyntaxNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (parent.type === 'export_statement') return true;
  if (parent.type === 'program') return false;
  return isExported(parent);
}

function parseNodeSymbols(
  node: import('tree-sitter').SyntaxNode,
  source: string,
  symbols: RawSymbol[],
  depth = 0
): void {
  const nodeType = node.type;

  // Function declarations
  if (nodeType === 'function_declaration' || nodeType === 'function') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const sourceText = extractNodeText(node, source);
      symbols.push({
        name: nameNode.text,
        kind: 'function',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: getFirstLine(sourceText),
        exported: isExported(node),
        sourceText,
      });
    }
  }

  // Arrow function / variable declaration
  else if (nodeType === 'lexical_declaration' || nodeType === 'variable_declaration') {
    for (const child of node.children) {
      if (child.type === 'variable_declarator') {
        const nameNode = child.childForFieldName('name');
        const valueNode = child.childForFieldName('value');
        if (nameNode) {
          const isArrow = valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function');
          const kind: SymbolKind = isArrow ? 'function' : 'variable';
          const sourceText = extractNodeText(node, source);
          symbols.push({
            name: nameNode.text,
            kind,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            signature: getFirstLine(sourceText),
            exported: isExported(node),
            sourceText,
          });
        }
      }
    }
  }

  // Class declarations
  else if (nodeType === 'class_declaration' || nodeType === 'class') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const sourceText = extractNodeText(node, source);
      const classSymbol: RawSymbol = {
        name: nameNode.text,
        kind: 'class',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: getFirstLine(sourceText),
        exported: isExported(node),
        sourceText,
        children: [],
      };

      // Extract methods from class body
      const body = node.childForFieldName('body');
      if (body) {
        for (const member of body.children) {
          if (member.type === 'method_definition' || member.type === 'public_field_definition') {
            const methodName = member.childForFieldName('name');
            if (methodName) {
              const methodText = extractNodeText(member, source);
              const isProperty = member.type === 'public_field_definition';
              classSymbol.children!.push({
                name: methodName.text,
                kind: isProperty ? 'property' : 'method',
                startLine: member.startPosition.row + 1,
                endLine: member.endPosition.row + 1,
                signature: getFirstLine(methodText),
                exported: false,
                sourceText: methodText,
              });
            }
          }
        }
      }

      symbols.push(classSymbol);
    }
  }

  // Interface declarations
  else if (nodeType === 'interface_declaration') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const sourceText = extractNodeText(node, source);
      symbols.push({
        name: nameNode.text,
        kind: 'interface',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: getFirstLine(sourceText),
        exported: isExported(node),
        sourceText,
      });
    }
  }

  // Type alias declarations
  else if (nodeType === 'type_alias_declaration') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const sourceText = extractNodeText(node, source);
      symbols.push({
        name: nameNode.text,
        kind: 'type',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: getFirstLine(sourceText),
        exported: isExported(node),
        sourceText,
      });
    }
  }

  // Enum declarations
  else if (nodeType === 'enum_declaration') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const sourceText = extractNodeText(node, source);
      symbols.push({
        name: nameNode.text,
        kind: 'enum',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: getFirstLine(sourceText),
        exported: isExported(node),
        sourceText,
      });
    }
  }

  // Namespace / module declarations
  else if (nodeType === 'module' || nodeType === 'internal_module') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const sourceText = extractNodeText(node, source);
      symbols.push({
        name: nameNode.text,
        kind: 'namespace',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: getFirstLine(sourceText),
        exported: isExported(node),
        sourceText,
      });
    }
  }

  // Export statement without a direct declaration (e.g., export { foo })
  else if (nodeType === 'export_statement') {
    // Recurse into the body of export statements
    for (const child of node.children) {
      if (
        child.type !== 'export' &&
        child.type !== 'default' &&
        child.type !== ';' &&
        child.type !== 'from' &&
        child.type !== 'string'
      ) {
        parseNodeSymbols(child, source, symbols, depth + 1);
      }
    }
    return;
  }

  // Recurse into top-level nodes only (not inside already-captured symbols)
  else if (depth === 0) {
    for (const child of node.children) {
      parseNodeSymbols(child, source, symbols, 0);
    }
    return;
  }
}

function extractImportsFromTree(
  rootNode: import('tree-sitter').SyntaxNode,
  source: string
): RawImport[] {
  const imports: RawImport[] = [];

  function walk(node: import('tree-sitter').SyntaxNode): void {
    if (node.type === 'import_statement') {
      const sourceNode = node.childForFieldName('source');
      const modulePath = sourceNode ? sourceNode.text.replace(/['"]/g, '') : '';
      const names: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      for (const child of node.children) {
        if (child.type === 'import_clause') {
          for (const ic of child.children) {
            if (ic.type === 'identifier') {
              isDefault = true;
              names.push(ic.text);
            } else if (ic.type === 'namespace_import') {
              isNamespace = true;
              const alias = ic.children.find(c => c.type === 'identifier');
              if (alias) names.push(alias.text);
            } else if (ic.type === 'named_imports') {
              for (const ni of ic.children) {
                if (ni.type === 'import_specifier') {
                  const nm = ni.childForFieldName('name') ?? ni.children[0];
                  if (nm) names.push(nm.text);
                }
              }
            }
          }
        }
      }

      imports.push({ source: modulePath, names, isDefault, isNamespace });
    } else {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(rootNode);
  return imports;
}

function parseWithTreeSitter(filePath: string, source: string): ParsedFile {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ParserClass = Parser as any;
  const parser = new ParserClass();
  parser.setLanguage(TypeScriptLang);
  const tree = parser.parse(source);
  const rootNode = tree.rootNode;

  const symbols: RawSymbol[] = [];
  for (const child of rootNode.children) {
    parseNodeSymbols(child, source, symbols, 0);
  }

  const imports = extractImportsFromTree(rootNode, source);

  return {
    filePath,
    hash: hashContent(source),
    symbols,
    imports,
  };
}

// ── Regex fallback parser ────────────────────────────────────────────────────

function parseWithRegex(filePath: string, source: string): ParsedFile {
  const lines = source.split('\n');
  const symbols: RawSymbol[] = [];
  const imports: RawImport[] = [];

  // Import extraction
  const importRegex = /^import\s+(?:(?:(\w+)|(?:\*\s+as\s+(\w+))|(?:\{([^}]+)\}))\s*,?\s*)*from\s+['"]([^'"]+)['"]/;
  // Function extraction
  const funcRegex = /^(export\s+)?(async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)/;
  const arrowRegex = /^(export\s+)?const\s+(\w+)\s*(?::[^=]+)?\s*=\s*(async\s+)?\([^)]*\)\s*(?::[^=]+)?\s*=>/;
  const classRegex = /^(export\s+)?(abstract\s+)?class\s+(\w+)/;
  const interfaceRegex = /^(export\s+)?interface\s+(\w+)/;
  const typeRegex = /^(export\s+)?type\s+(\w+)/;
  const enumRegex = /^(export\s+)?enum\s+(\w+)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Imports
    const impMatch = trimmed.match(importRegex);
    if (impMatch) {
      const defaultName = impMatch[1];
      const namespaceName = impMatch[2];
      const namedStr = impMatch[3];
      const src = impMatch[4] ?? '';
      const names: string[] = [];
      if (defaultName) names.push(defaultName);
      if (namespaceName) names.push(namespaceName);
      if (namedStr) names.push(...namedStr.split(',').map(s => s.trim()).filter(Boolean));
      imports.push({
        source: src,
        names,
        isDefault: !!defaultName,
        isNamespace: !!namespaceName,
      });
      i++;
      continue;
    }

    // Functions
    const funcMatch = trimmed.match(funcRegex);
    if (funcMatch) {
      const startLine = i + 1;
      let endLine = startLine;
      // Find closing brace
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of (lines[j] ?? '')) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth === 0 && j > i) { endLine = j + 1; break; }
      }
      symbols.push({
        name: funcMatch[3] ?? '',
        kind: 'function',
        startLine,
        endLine,
        signature: trimmed,
        exported: !!funcMatch[1],
        sourceText: lines.slice(i, endLine).join('\n'),
      });
      i = endLine;
      continue;
    }

    // Arrow functions
    const arrowMatch = trimmed.match(arrowRegex);
    if (arrowMatch) {
      const startLine = i + 1;
      let endLine = startLine;
      let depth = 0;
      for (let j = i; j < Math.min(i + 200, lines.length); j++) {
        for (const ch of (lines[j] ?? '')) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth === 0 && j > i) { endLine = j + 1; break; }
      }
      symbols.push({
        name: arrowMatch[2] ?? '',
        kind: 'function',
        startLine,
        endLine,
        signature: trimmed,
        exported: !!arrowMatch[1],
        sourceText: lines.slice(i, endLine).join('\n'),
      });
      i = endLine;
      continue;
    }

    // Classes
    const classMatch = trimmed.match(classRegex);
    if (classMatch) {
      const startLine = i + 1;
      let endLine = startLine;
      let depth = 0;
      const children: RawSymbol[] = [];
      for (let j = i; j < lines.length; j++) {
        for (const ch of (lines[j] ?? '')) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth === 0 && j > i) {
          endLine = j + 1;
          // Extract methods
          const classSource = lines.slice(i, endLine).join('\n');
          const methodRegex = /^\s+(?:public|private|protected|static|async|readonly|\s)*(\w+)\s*\(/gm;
          let mMatch;
          while ((mMatch = methodRegex.exec(classSource)) !== null) {
            if (mMatch[1] && mMatch[1] !== 'if' && mMatch[1] !== 'for' && mMatch[1] !== 'while') {
              children.push({
                name: mMatch[1],
                kind: 'method',
                startLine: startLine,
                endLine: startLine,
                signature: mMatch[0].trim(),
                exported: false,
                sourceText: mMatch[0].trim(),
              });
            }
          }
          break;
        }
      }
      symbols.push({
        name: classMatch[3] ?? '',
        kind: 'class',
        startLine,
        endLine,
        signature: trimmed,
        exported: !!classMatch[1],
        sourceText: lines.slice(i, endLine).join('\n'),
        children,
      });
      i = endLine;
      continue;
    }

    // Interfaces
    const ifaceMatch = trimmed.match(interfaceRegex);
    if (ifaceMatch) {
      const startLine = i + 1;
      let endLine = startLine;
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of (lines[j] ?? '')) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth === 0 && j > i) { endLine = j + 1; break; }
      }
      symbols.push({
        name: ifaceMatch[2] ?? '',
        kind: 'interface',
        startLine,
        endLine,
        signature: trimmed,
        exported: !!ifaceMatch[1],
        sourceText: lines.slice(i, endLine).join('\n'),
      });
      i = endLine;
      continue;
    }

    // Types
    const typeMatch = trimmed.match(typeRegex);
    if (typeMatch) {
      symbols.push({
        name: typeMatch[2] ?? '',
        kind: 'type',
        startLine: i + 1,
        endLine: i + 1,
        signature: trimmed,
        exported: !!typeMatch[1],
        sourceText: trimmed,
      });
      i++;
      continue;
    }

    // Enums
    const enumMatch = trimmed.match(enumRegex);
    if (enumMatch) {
      const startLine = i + 1;
      let endLine = startLine;
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of (lines[j] ?? '')) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth === 0 && j > i) { endLine = j + 1; break; }
      }
      symbols.push({
        name: enumMatch[2] ?? '',
        kind: 'enum',
        startLine,
        endLine,
        signature: trimmed,
        exported: !!enumMatch[1],
        sourceText: lines.slice(i, endLine).join('\n'),
      });
      i = endLine;
      continue;
    }

    i++;
  }

  return {
    filePath,
    hash: hashContent(source),
    symbols,
    imports,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parseFile(filePath: string): ParsedFile {
  const source = fs.readFileSync(filePath, 'utf-8');
  return parseSource(filePath, source);
}

export function parseSource(filePath: string, source: string): ParsedFile {
  if (Parser && TypeScriptLang) {
    try {
      return parseWithTreeSitter(filePath, source);
    } catch (err) {
      // Fall through to regex parser
    }
  }
  return parseWithRegex(filePath, source);
}

export function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.ts' || ext === '.tsx';
}
