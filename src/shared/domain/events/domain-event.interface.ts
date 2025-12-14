/**
 * Domain Event Interface
 */
export interface DomainEvent {
  occurredOn: Date;
  eventName: string;
  aggregateId: string;
}
