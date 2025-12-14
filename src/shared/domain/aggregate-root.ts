import { BaseEntity } from './base-entity';
import { DomainEvent } from './events/domain-event.interface';

/**
 * Aggregate Root - DDD의 집합 루트
 */
export abstract class AggregateRoot extends BaseEntity {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
