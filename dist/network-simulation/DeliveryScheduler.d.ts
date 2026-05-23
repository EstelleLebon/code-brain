export interface ScheduledMessage {
    messageId: string;
    payload: unknown;
    sourceNodeId: string;
    targetNodeId: string;
    scheduledAt: number;
    deliverAt: number;
    delivered: boolean;
}
export declare class DeliveryScheduler {
    private queue;
    private clock;
    private seed;
    constructor(seed?: number);
    private nextRand;
    schedule(payload: unknown, sourceNodeId: string, targetNodeId: string, delay?: number): ScheduledMessage;
    scheduleWithJitter(payload: unknown, sourceNodeId: string, targetNodeId: string, baseDelay: number, jitterMax: number): ScheduledMessage;
    tick(): ScheduledMessage[];
    getPending(): ScheduledMessage[];
    getClock(): number;
    getAllMessages(): readonly ScheduledMessage[];
}
//# sourceMappingURL=DeliveryScheduler.d.ts.map