import { Injectable } from '@nestjs/common';
import { InMemoryRepository } from '../../../../infrastructure/database/in-memory.repository';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { Call } from '../../domain/entities/Call.entity';
import { CallStatusEnum } from '../../domain/value-objects/CallStatus.vo';

/**
 * Call Repository Implementation
 *
 * @description In-Memory 기반 통화 리포지토리 구현
 */
@Injectable()
export class CallRepository
  extends InMemoryRepository<Call>
  implements ICallRepository
{
  async findBySessionId(sessionId: string): Promise<Call | null> {
    const call = Array.from(this.items.values()).find(
      (c) => c.sessionId === sessionId,
    );
    return call || null;
  }

  async findActiveCallsByCallerNumber(callerNumber: string): Promise<Call[]> {
    return Array.from(this.items.values()).filter(
      (call) =>
        call.callerNumber.value === callerNumber && call.status.isActive(),
    );
  }

  async findByStatus(status: CallStatusEnum): Promise<Call[]> {
    return Array.from(this.items.values()).filter(
      (call) => call.status.value === status,
    );
  }
}
