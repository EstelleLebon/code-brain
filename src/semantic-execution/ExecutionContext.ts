export interface ExecutionContext {
  transformationId: string;
  workingDirectory: string;
  dryRun: boolean;
  files: Map<string, string>;  // filePath → original source
}

export function createExecutionContext(
  transformationId: string,
  workingDirectory: string,
  files: Map<string, string>,
  dryRun = true
): ExecutionContext {
  return { transformationId, workingDirectory, dryRun, files };
}
