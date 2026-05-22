export interface ScheduledMessage {
  messageId: string;
  payload: unknown;
  sourceNodeId: string;
  targetNodeId: string;
  scheduledAt: number;
  deliverAt: number;
  delivered: boolean;
}

export class DeliveryScheduler {
  private queue: ScheduledMessage[] = [];
  private clock = 0;
  private seed: number;

  constructor(seed = 42) {
    this.seed = seed;
  }

  private nextRand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(this.seed) / 0x7fffffff;
  }

  schedule(payload: unknown, sourceNodeId: string, targetNodeId: string, delay = 0): ScheduledMessage {
    const msg: ScheduledMessage = {
      messageId: `msg-${this.clock}`,
      payload,
      sourceNodeId,
      targetNodeId,
      scheduledAt: this.clock,
      deliverAt: this.clock + delay,
      delivered: false,
    };
    this.queue.push(msg);
    return msg;
  }

  scheduleWithJitter(payload: unknown, sourceNodeId: string, targetNodeId: string, baseDelay: number, jitterMax: number): ScheduledMessage {
    const jitter = Math.floor(this.nextRand() * jitterMax);
    return this.schedule(payload, sourceNodeId, targetNodeId, baseDelay + jitter);
  }

  tick(): ScheduledMessage[] {
    this.clock++;
    const due = this.queue.filter(m => !m.delivered && m.deliverAt <= this.clock);
    due.sort((a, b) => a.messageId.localeCompare(b.messageId));
    for (const m of due) m.delivered = true;
    return due;
  }

  getPending(): ScheduledMessage[] {
    return this.queue.filter(m => !m.delivered).sort((a, b) => a.deliverAt - b.deliverAt);
  }

  getClock(): number { return this.clock; }
  getAllMessages(): readonly ScheduledMessage[] { return this.queue; }
}
