export interface RetrievalValidationResult {
  valid: boolean;
  staleArtifacts: string[];
  contradictions: string[];
  warnings: string[];
}
