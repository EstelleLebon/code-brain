export type EpisodeType = 'transformation' | 'failure' | 'recovery' | 'session';

export interface Episode {
  id: string;
  type: EpisodeType;
  title: string;
  summary: string;
  tags: string[];
  timestamp: number;
  metadata: Record<string, unknown>;
}

function makeId(): string {
  return `ep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Records significant events: critical transformations, failures, recoveries, sessions.
 * Stored in-memory with optional size cap; notable episodes persist via SQLite if wired.
 */
export class EpisodicMemory {
  private episodes: Episode[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  record(
    type: EpisodeType,
    title: string,
    summary: string,
    tags: string[] = [],
    metadata: Record<string, unknown> = {},
  ): Episode {
    const episode: Episode = { id: makeId(), type, title, summary, tags, timestamp: Date.now(), metadata };
    this.episodes.push(episode);
    if (this.episodes.length > this.maxSize) this.episodes.shift();
    return episode;
  }

  search(type?: EpisodeType, tag?: string): Episode[] {
    return this.episodes.filter(e => {
      if (type && e.type !== type) return false;
      if (tag && !e.tags.includes(tag)) return false;
      return true;
    });
  }

  recent(limit = 10): Episode[] {
    return [...this.episodes].slice(-limit).reverse();
  }

  all(): Episode[] {
    return [...this.episodes];
  }

  size(): number {
    return this.episodes.length;
  }
}
