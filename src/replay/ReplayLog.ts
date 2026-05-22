import { CognitiveReplayEvent, ReplayEventType } from './types.js';

export class ReplayLog {
  private events: CognitiveReplayEvent[] = [];

  record(
    eventType: ReplayEventType,
    artifactIds: string[],
    transactionId: string,
    metadata?: Record<string, unknown>
  ): CognitiveReplayEvent {
    const event: CognitiveReplayEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      eventType,
      artifactIds,
      transactionId,
      metadata,
    };
    this.events.push(event);
    return event;
  }

  getEvents(): CognitiveReplayEvent[] { return [...this.events]; }

  getEventsByType(type: ReplayEventType): CognitiveReplayEvent[] {
    return this.events.filter(e => e.eventType === type);
  }

  getEventsByTransaction(transactionId: string): CognitiveReplayEvent[] {
    return this.events.filter(e => e.transactionId === transactionId);
  }

  since(timestamp: number): CognitiveReplayEvent[] {
    return this.events.filter(e => e.timestamp >= timestamp);
  }

  clear(): void { this.events = []; }
}
