import { ASTMutation } from './ASTMutation.js';
import { SemanticOperation } from '../semantic-ir/types.js';

let Parser: typeof import('tree-sitter') | null = null;
let TypeScriptLang: unknown = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Parser = require('tree-sitter');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tsModule = require('tree-sitter-typescript');
  TypeScriptLang = tsModule.typescript ?? tsModule;
} catch {
  // tree-sitter unavailable; regex fallback will be used
}

type SyntaxNode = import('tree-sitter').SyntaxNode;

function collectIdentifiers(node: SyntaxNode, name: string, results: SyntaxNode[]): void {
  const identifierTypes = new Set([
    'identifier', 'type_identifier', 'property_identifier',
    'shorthand_property_identifier', 'shorthand_property_identifier_pattern',
  ]);
  if (identifierTypes.has(node.type) && node.text === name) {
    results.push(node);
  }
  for (const child of node.children) {
    collectIdentifiers(child, name, results);
  }
}

function findFunctionNode(node: SyntaxNode, name: string): SyntaxNode | null {
  const functionTypes = new Set([
    'function_declaration', 'lexical_declaration', 'variable_declaration',
  ]);
  if (functionTypes.has(node.type)) {
    // direct function_declaration
    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode?.text === name) return node;
    }
    // const foo = () => ...
    if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      for (const child of node.children) {
        if (child.type === 'variable_declarator') {
          const n = child.childForFieldName('name');
          if (n?.text === name) return node;
        }
      }
    }
  }
  for (const child of node.children) {
    const found = findFunctionNode(child, name);
    if (found) return found;
  }
  return null;
}

function findClassNode(node: SyntaxNode, name: string): SyntaxNode | null {
  if (node.type === 'class_declaration') {
    const nameNode = node.childForFieldName('name');
    if (nameNode?.text === name) return node;
  }
  for (const child of node.children) {
    const found = findClassNode(child, name);
    if (found) return found;
  }
  return null;
}

function extractPublicMethods(classNode: SyntaxNode, source: string): Array<{ name: string; params: string; returnType: string }> {
  const methods: Array<{ name: string; params: string; returnType: string }> = [];
  const body = classNode.childForFieldName('body');
  if (!body) return methods;

  for (const member of body.children) {
    if (member.type !== 'method_definition') continue;
    const modifiers = member.children
      .filter(c => c.type === 'accessibility_modifier')
      .map(c => c.text);
    if (modifiers.includes('private') || modifiers.includes('protected')) continue;

    const nameNode = member.childForFieldName('name');
    if (!nameNode || nameNode.text === 'constructor') continue;

    const paramsNode = member.childForFieldName('parameters');
    const params = paramsNode ? source.slice(paramsNode.startIndex + 1, paramsNode.endIndex - 1).trim() : '';

    const returnTypeNode = member.childForFieldName('return_type');
    const returnType = returnTypeNode ? source.slice(returnTypeNode.startIndex + 1, returnTypeNode.endIndex).trim() : 'unknown';

    methods.push({ name: nameNode.text, params, returnType });
  }
  return methods;
}

function parseSource(source: string): SyntaxNode | null {
  if (!Parser || !TypeScriptLang) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new (Parser as any)();
    parser.setLanguage(TypeScriptLang);
    return parser.parse(source).rootNode as SyntaxNode;
  } catch {
    return null;
  }
}

// ── Regex fallbacks ───────────────────────────────────────────────────────────

function renameWithRegex(source: string, oldName: string, newName: string, filePath: string): ASTMutation[] {
  const mutations: ASTMutation[] = [];
  const pattern = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    mutations.push({
      filePath,
      startIndex: match.index,
      endIndex: match.index + oldName.length,
      replacement: newName,
      reason: `rename_symbol: ${oldName} → ${newName}`,
    });
  }
  return mutations;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EngineContext {
  filePath: string;
  source: string;
  allFiles?: Map<string, string>;
}

export class TransformationEngine {
  planMutations(operation: SemanticOperation, ctx: EngineContext): ASTMutation[] {
    switch (operation.operationType) {
      case 'rename_symbol':    return this.planRename(operation, ctx);
      case 'move_function':    return this.planMoveFunction(operation, ctx);
      case 'extract_interface': return this.planExtractInterface(operation, ctx);
      default:                 return [];
    }
  }

  private planRename(op: SemanticOperation, ctx: EngineContext): ASTMutation[] {
    const newName = (op as unknown as { payload?: { newName?: string } }).payload?.newName;
    if (!newName || op.targetSymbols.length === 0) return [];

    const oldName = op.targetSymbols[0]!;
    const rootNode = parseSource(ctx.source);

    if (!rootNode) return renameWithRegex(ctx.source, oldName, newName, ctx.filePath);

    const nodes: SyntaxNode[] = [];
    collectIdentifiers(rootNode, oldName, nodes);

    return nodes.map(n => ({
      filePath: ctx.filePath,
      startIndex: n.startIndex,
      endIndex: n.endIndex,
      replacement: newName,
      reason: `rename_symbol: ${oldName} → ${newName}`,
    }));
  }

  private planMoveFunction(op: SemanticOperation, ctx: EngineContext): ASTMutation[] {
    if (op.targetSymbols.length === 0) return [];
    const fnName = op.targetSymbols[0]!;
    const destination = (op as unknown as { payload?: { destinationModule?: string } }).payload?.destinationModule;
    if (!destination) return [];

    const rootNode = parseSource(ctx.source);
    if (!rootNode) return [];

    const fnNode = findFunctionNode(rootNode, fnName);
    if (!fnNode) return [];

    const fnSource = ctx.source.slice(fnNode.startIndex, fnNode.endIndex);

    // Removal mutation: remove the function + any leading newline
    const removeStart = fnNode.startIndex > 0 && ctx.source[fnNode.startIndex - 1] === '\n'
      ? fnNode.startIndex - 1
      : fnNode.startIndex;

    const mutations: ASTMutation[] = [
      {
        filePath: ctx.filePath,
        startIndex: removeStart,
        endIndex: fnNode.endIndex,
        replacement: '',
        reason: `move_function: remove ${fnName} from ${ctx.filePath}`,
      },
    ];

    // Insertion mutation: append to destination file
    const destPath = destination.endsWith('.ts') ? destination : `${destination}.ts`;
    if (ctx.allFiles?.has(destPath)) {
      const destSource = ctx.allFiles.get(destPath)!;
      mutations.push({
        filePath: destPath,
        startIndex: destSource.length,
        endIndex: destSource.length,
        replacement: `\n\n${fnSource}`,
        reason: `move_function: insert ${fnName} into ${destPath}`,
      });
    }

    return mutations;
  }

  private planExtractInterface(op: SemanticOperation, ctx: EngineContext): ASTMutation[] {
    if (op.targetSymbols.length === 0) return [];
    const className = op.targetSymbols[0]!;

    const rootNode = parseSource(ctx.source);
    if (!rootNode) return [];

    const classNode = findClassNode(rootNode, className);
    if (!classNode) return [];

    const methods = extractPublicMethods(classNode, ctx.source);
    if (methods.length === 0) return [];

    const methodSignatures = methods
      .map(m => `  ${m.name}(${m.params}): ${m.returnType};`)
      .join('\n');
    const interfaceSource = `export interface I${className} {\n${methodSignatures}\n}\n\n`;

    return [{
      filePath: ctx.filePath,
      startIndex: classNode.startIndex,
      endIndex: classNode.startIndex,
      replacement: interfaceSource,
      reason: `extract_interface: I${className} from ${className}`,
    }];
  }
}
