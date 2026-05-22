export interface ASTMutation {
    filePath: string;
    startIndex: number;
    endIndex: number;
    replacement: string;
    reason: string;
}
export interface FileMutations {
    filePath: string;
    source: string;
    mutations: ASTMutation[];
}
//# sourceMappingURL=ASTMutation.d.ts.map