export interface ExecutionContext {
    transformationId: string;
    workingDirectory: string;
    dryRun: boolean;
    files: Map<string, string>;
}
export declare function createExecutionContext(transformationId: string, workingDirectory: string, files: Map<string, string>, dryRun?: boolean): ExecutionContext;
//# sourceMappingURL=ExecutionContext.d.ts.map