"use strict";
/**
 * Code Brain — Example: Index a repository and query it
 *
 * Usage:
 *   node dist/examples/index-repo.js [path-to-repo]
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const api_js_1 = require("../api/api.js");
async function main() {
    const repoPath = process.argv[2] ?? process.cwd();
    const dbPath = path_1.default.join(os_1.default.tmpdir(), 'code-brain-example.db');
    console.log(`\nCode Brain v1.0.0`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Indexing: ${repoPath}`);
    console.log(`Database: ${dbPath}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    // 1. Create CodeBrain instance
    const brain = new api_js_1.CodeBrain({
        dbPath,
        telemetry: false, // suppress telemetry for cleaner output
    });
    // 2. Index a directory
    console.log('Indexing repository...');
    const stats = await brain.indexRepository(repoPath);
    console.log('\nIndex complete:');
    console.log(`  Symbols:  ${stats.symbolCount}`);
    console.log(`  Chunks:   ${stats.chunkCount}`);
    console.log(`  Edges:    ${stats.edgeCount}`);
    console.log(`  Claims:   ${stats.claimCount}`);
    console.log(`  Duration: ${stats.durationMs}ms`);
    if (stats.symbolCount === 0) {
        console.log('\nNo TypeScript files found in the directory.');
        brain.close();
        return;
    }
    // 3. Find relevant symbols for a query
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const query = 'function class export interface';
    console.log(`\nFinding relevant symbols for: "${query}"`);
    const relevant = brain.findRelevant(query, 5);
    console.log(`\nTop ${relevant.length} results:`);
    for (const result of relevant) {
        const chunk = result.chunk;
        console.log(`  [score=${result.score.toFixed(3)}] chunk: ${chunk.id}`);
        console.log(`    File: ${path_1.default.relative(repoPath, result.trace.source)}`);
        if (chunk.summary) {
            const sig = chunk.summary.slice(0, 80);
            console.log(`    Summary: ${sig}${chunk.summary.length > 80 ? '...' : ''}`);
        }
    }
    // 4. Get context for a task
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const task = 'parsing and extracting symbols from TypeScript files';
    console.log(`\nContext for task: "${task}"`);
    const ctx = brain.getContext(task);
    console.log(`\nContext expanded to:`);
    console.log(`  Symbols: ${ctx.symbols.length}`);
    console.log(`  Chunks:  ${ctx.chunks.length}`);
    console.log(`  Claims:  ${ctx.claims.length}`);
    if (ctx.symbols.length > 0) {
        console.log('\nMost relevant symbols:');
        for (const sym of ctx.symbols.slice(0, 3)) {
            console.log(`  • [${sym.kind}] ${sym.name} — ${path_1.default.relative(repoPath, sym.filePath)}:${sym.startLine}`);
        }
    }
    if (ctx.claims.length > 0) {
        console.log('\nSample claims:');
        for (const claim of ctx.claims.slice(0, 5)) {
            const sym = brain.getSymbolById(claim.symbolId);
            console.log(`  • ${sym?.name ?? claim.symbolId}: ${claim.claim}`);
        }
    }
    // 5. Get graph overview
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nDependency Graph:');
    const graph = brain.getGraph();
    console.log(`  Nodes: ${graph.nodes.length}`);
    console.log(`  Edges: ${graph.edges.length}`);
    if (graph.edges.length > 0) {
        const kindCounts = new Map();
        for (const edge of graph.edges) {
            kindCounts.set(edge.kind, (kindCounts.get(edge.kind) ?? 0) + 1);
        }
        console.log('  Edge kinds:');
        for (const [kind, count] of kindCounts.entries()) {
            console.log(`    ${kind}: ${count}`);
        }
    }
    // 6. Start watching for changes (briefly)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nStarting file watcher (3 seconds)...');
    brain.onWatchEvent((evt) => {
        console.log(`  [watch] ${evt.event}: ${path_1.default.basename(evt.filePath)} (changed: ${evt.changed})`);
    });
    brain.startWatching(repoPath);
    console.log('  Watcher active. Modify a .ts file to see events.');
    await new Promise(resolve => setTimeout(resolve, 3000));
    brain.stopWatching();
    console.log('  Watcher stopped.');
    // Cleanup
    brain.close();
    console.log('\nDone.\n');
}
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=index-repo.js.map