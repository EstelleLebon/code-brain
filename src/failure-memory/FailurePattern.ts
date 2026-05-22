export interface FailurePattern {
  id: string;
  operationType: string;
  structuralContext: string[];
  runtimeConsequences: string[];
  frequency: number;
  severity: number;
  lastSeen: number;
}
