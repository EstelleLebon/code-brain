export interface FingerprintComponent {
  label: string;
  value: string;
}

export interface ExecutionFingerprint {
  executionId: string;
  components: FingerprintComponent[];
  hash: string;
  createdAt: Date;
}

export interface FingerprintDiff {
  matching: string[];
  diverging: Array<{ label: string; a: string; b: string }>;
  identical: boolean;
  similarityScore: number; // 0–1
}

function simpleHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface FingerprintInput {
  executionId: string;
  planTopology?: string; // e.g. JSON-serialized step IDs in order
  mutations?: string[];
  runtimeSignals?: Record<string, unknown>;
  events?: string[];
  cognitiveMode?: string;
  trustLevel?: number;
}

export function fingerprintExecution(input: FingerprintInput): ExecutionFingerprint {
  const components: FingerprintComponent[] = [
    { label: 'plan_topology', value: input.planTopology ?? '' },
    { label: 'mutations', value: (input.mutations ?? []).sort().join(',') },
    { label: 'runtime_signals', value: JSON.stringify(input.runtimeSignals ?? {}) },
    { label: 'events', value: (input.events ?? []).join(',') },
    { label: 'cognitive_mode', value: input.cognitiveMode ?? '' },
    { label: 'trust_level', value: String(Math.round((input.trustLevel ?? 1) * 100)) },
  ];

  const raw = components.map(c => `${c.label}:${c.value}`).join('|');
  const hash = simpleHash(raw);

  return {
    executionId: input.executionId,
    components,
    hash,
    createdAt: new Date(),
  };
}

export function compareFingerprints(a: ExecutionFingerprint, b: ExecutionFingerprint): FingerprintDiff {
  const matching: string[] = [];
  const diverging: FingerprintDiff['diverging'] = [];

  const bMap = new Map(b.components.map(c => [c.label, c.value]));

  for (const comp of a.components) {
    const bVal = bMap.get(comp.label);
    if (bVal === comp.value) {
      matching.push(comp.label);
    } else {
      diverging.push({ label: comp.label, a: comp.value, b: bVal ?? '' });
    }
  }

  const total = a.components.length;
  const similarityScore = total === 0 ? 1 : matching.length / total;

  return {
    matching,
    diverging,
    identical: diverging.length === 0,
    similarityScore,
  };
}
