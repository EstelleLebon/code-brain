"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTSerializer = void 0;
class ASTSerializer {
    serialize(filePath, source) {
        return {
            filePath,
            source,
            lineCount: source.split('\n').length,
            byteSize: Buffer.byteLength(source, 'utf-8'),
        };
    }
    serializeAll(fileMap) {
        const results = [];
        for (const [filePath, source] of fileMap) {
            results.push(this.serialize(filePath, source));
        }
        return results;
    }
}
exports.ASTSerializer = ASTSerializer;
//# sourceMappingURL=ASTSerializer.js.map