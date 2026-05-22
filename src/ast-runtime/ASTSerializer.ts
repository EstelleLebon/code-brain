export interface SerializedOutput {
  filePath: string;
  source: string;
  lineCount: number;
  byteSize: number;
}

export class ASTSerializer {
  serialize(filePath: string, source: string): SerializedOutput {
    return {
      filePath,
      source,
      lineCount: source.split('\n').length,
      byteSize: Buffer.byteLength(source, 'utf-8'),
    };
  }

  serializeAll(fileMap: Map<string, string>): SerializedOutput[] {
    const results: SerializedOutput[] = [];
    for (const [filePath, source] of fileMap) {
      results.push(this.serialize(filePath, source));
    }
    return results;
  }
}
