export interface SerializedOutput {
    filePath: string;
    source: string;
    lineCount: number;
    byteSize: number;
}
export declare class ASTSerializer {
    serialize(filePath: string, source: string): SerializedOutput;
    serializeAll(fileMap: Map<string, string>): SerializedOutput[];
}
//# sourceMappingURL=ASTSerializer.d.ts.map