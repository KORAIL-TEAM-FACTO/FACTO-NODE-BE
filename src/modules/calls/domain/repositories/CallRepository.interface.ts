import { Call } from '../entities/Call.entity';
import { CallStatusEnum } from '../value-objects/CallStatus.vo';

/**
 * Call Repository Interface
 *
 * @description 통화 데이터 접근 인터페이스
 */
export interface ICallRepository {
  findById(id: string): Promise<Call | null>;
  findBySessionId(sessionId: string): Promise<Call | null>;
  findActiveCallsByCallerNumber(callerNumber: string): Promise<Call[]>;
  findByStatus(status: CallStatusEnum): Promise<Call[]>;
  findAll(): Promise<Call[]>;
  save(call: Call): Promise<Call>;
  update(call: Call): Promise<Call>;
  delete(id: string): Promise<void>;
}

export const CALL_REPOSITORY = Symbol('CALL_REPOSITORY');
